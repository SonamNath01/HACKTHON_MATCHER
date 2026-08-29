import { Prisma, User, UserSkill } from '@prisma/client';
import { prisma } from '../lib/prisma';

// scoreCandidate only ever reads these specific fields off "team" and
// "candidate" — a minimal structural type instead of a strict Prisma payload
// type, so it works unmodified whether it's scoring candidates for a team
// (calculateMatches) or teams for a candidate (calculateTeamMatches).
type TeamForScoring = {
  requiredSkills: { skillId: string }[];
  leader: { timezoneOffset: number; availability: User['availability'] };
};

// Fields safe to return to the leader viewing ranked candidates —
// deliberately excludes the password hash.
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  bio: true,
  githubUrl: true,
  portfolioUrl: true,
  timezoneOffset: true,
  availability: true,
  reliabilityScore: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type CandidateForScoring = {
  skills: { skillId: string; proficiency: UserSkill['proficiency'] }[];
  reliabilityScore: number;
  timezoneOffset: number;
  availability: User['availability'];
};

type MatchResult = {
  candidate: Omit<User, 'password'>;
  score: number;
  breakdown: {
    skillScore: number;
    reliabilityScore: number;
    timezoneScore: number;
    commitmentScore: number;
  };
};

// Max candidates/teams scored per request so a huge user base can't be
// loaded into memory in one go.
const MAX_CANDIDATES = 200;
const MAX_TEAMS_FOR_MATCHING = 100;

const PROFICIENCY_WEIGHT: Record<UserSkill['proficiency'], number> = {
  BEGINNER: 0.6,
  INTERMEDIATE: 0.8,
  EXPERT: 1,
};

// Same 4-part formula used by both calculateMatches and calculateSingleMatch,
// kept in one place so they can never drift apart.
const scoreCandidate = (team: TeamForScoring, candidate: CandidateForScoring) => {
  // SKILL SCORE (0-40) — weighted by how proficient the candidate is at each required skill
  const requiredSkillIds = team.requiredSkills.map(s => s.skillId);
  const candidateSkillsById = new Map(candidate.skills.map(s => [s.skillId, s]));

  const matchedWeight = requiredSkillIds.reduce((sum, skillId) => {
    const userSkill = candidateSkillsById.get(skillId);
    return userSkill ? sum + PROFICIENCY_WEIGHT[userSkill.proficiency] : sum;
  }, 0);

  const skillScore = requiredSkillIds.length === 0
    ? 40
    : (matchedWeight / requiredSkillIds.length) * 40;

  // RELIABILITY SCORE (0-30)
  const reliabilityScore = (candidate.reliabilityScore / 100) * 30;

  // TIMEZONE SCORE (0-20) — offsets wrap around the date line (UTC-12 is next to UTC+14)
  const rawDiff = Math.abs(team.leader.timezoneOffset - candidate.timezoneOffset);
  const timezoneDiff = Math.min(rawDiff, 24 - rawDiff);
  const timezoneScore = Math.max(0, 20 - (timezoneDiff * 2));

  // COMMITMENT SCORE (0-10)
  let commitmentScore = 0;
  const leaderAvailability = team.leader.availability;
  const candidateAvailability = candidate.availability;

  if (leaderAvailability === candidateAvailability) {
    commitmentScore = 10;
  } else if (
    (leaderAvailability === 'FULL_TIME' && candidateAvailability === 'PART_TIME') ||
    (leaderAvailability === 'PART_TIME' && candidateAvailability === 'FULL_TIME') ||
    (leaderAvailability === 'PART_TIME' && candidateAvailability === 'WEEKENDS_ONLY') ||
    (leaderAvailability === 'WEEKENDS_ONLY' && candidateAvailability === 'PART_TIME')
  ) {
    commitmentScore = 5;
  }

  const score = Math.round(skillScore + reliabilityScore + timezoneScore + commitmentScore);

  return { score, breakdown: { skillScore, reliabilityScore, timezoneScore, commitmentScore } };
};

export const calculateMatches = async (teamId: string): Promise<MatchResult[]> => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { requiredSkills: true, leader: true },
  });

  if (!team) throw new Error('Team not found');

  const requiredSkillIds = team.requiredSkills.map(s => s.skillId);

  // Narrow the candidate pool at the DB level: exclude existing members, and
  // when the team wants specific skills, only pull users who have at least
  // one of them instead of loading every user in the system into memory.
  const candidates = await prisma.user.findMany({
    where: {
      memberOfTeams: { none: { teamId } },
      ...(requiredSkillIds.length > 0
        ? { skills: { some: { skillId: { in: requiredSkillIds } } } }
        : {}),
    },
    // select (not include) so the password hash never leaves the DB layer;
    // nest the skill relation (not just skillId) so the frontend can show
    // skill names — calculateSingleMatch doesn't need this, it only returns a number.
    select: { ...SAFE_USER_SELECT, skills: { include: { skill: true } } },
    take: MAX_CANDIDATES,
  });

  const results: MatchResult[] = candidates.map(candidate => {
    const { score, breakdown } = scoreCandidate(team, candidate);
    return { candidate, score, breakdown };
  });

  return results.sort((a, b) => b.score - a.score);
};

// Same lookup as calculateSingleMatch, but also returns the breakdown — used
// wherever the UI needs to explain the score, not just show the number.
export const calculateSingleMatchDetailed = async (
  teamId: string,
  userId: string
): Promise<{ score: number; breakdown: MatchResult['breakdown'] }> => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { requiredSkills: true, leader: true },
  });
  if (!team) throw new Error('Team not found');

  const candidate = await prisma.user.findUnique({
    where: { id: userId },
    include: { skills: true },
  });
  if (!candidate) throw new Error('Candidate not found');

  return scoreCandidate(team, candidate);
};

export const calculateSingleMatch = async (
  teamId: string,
  userId: string
): Promise<number> => {
  const { score } = await calculateSingleMatchDetailed(teamId, userId);
  return score;
};

type TeamForMatching = Prisma.TeamGetPayload<{
  include: {
    requiredSkills: { include: { skill: true } };
    hackathon: true;
    leader: { select: typeof SAFE_USER_SELECT };
    _count: { select: { members: true } };
  };
}>;

export type TeamMatchResult = {
  team: Omit<TeamForMatching, 'leader'> & { leader: Omit<User, 'password'> };
  score: number;
  breakdown: MatchResult['breakdown'];
};

// The mirror image of calculateMatches: instead of ranking candidates for a
// team, this ranks FORMING teams for one candidate — same scoreCandidate
// formula, just called with the roles reversed (the browsing user stands in
// for "candidate", each team's leader supplies the timezone/availability
// half of the formula, exactly like it does for calculateMatches).
export const calculateTeamMatches = async (userId: string): Promise<TeamMatchResult[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { skills: true },
  });
  if (!user) throw new Error('User not found');

  const teams = await prisma.team.findMany({
    where: {
      status: 'FORMING',
      members: { none: { userId } },
    },
    include: {
      requiredSkills: { include: { skill: true } },
      hackathon: true,
      leader: { select: SAFE_USER_SELECT },
      _count: { select: { members: true } },
    },
    take: MAX_TEAMS_FOR_MATCHING,
  });

  const results: TeamMatchResult[] = teams.map(team => {
    const { score, breakdown } = scoreCandidate(team, user);
    return { team, score, breakdown };
  });

  return results.sort((a, b) => b.score - a.score);
};
