import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

type MatchResult = {
  candidate: User;
  score: number;
  breakdown: {
    skillScore: number;
    reliabilityScore: number;
    timezoneScore: number;
    commitmentScore: number;
  };
};

export const calculateMatches = async (teamId: string): Promise<MatchResult[]> => {
  // fetch team with required skills and leader
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      requiredSkills: true,
      leader: true,
    }
  });

  if (!team) throw new Error('Team not found');

  // fetch all candidates who are NOT already on this team
  const candidates = await prisma.user.findMany({
    where: {
      memberOfTeams: { none: { teamId } }  // exclude existing members
    },
    include: { skills: true }
  });

  const results: MatchResult[] = candidates.map(candidate => {

    // SKILL SCORE (0-40)
    const requiredSkillIds = team.requiredSkills.map(s => s.skillId);
    const candidateSkillIds = candidate.skills.map(s => s.skillId);
    const matchingSkills = requiredSkillIds.filter(id =>
      candidateSkillIds.includes(id)
    );
    const skillScore = requiredSkillIds.length === 0 ? 40 :
      (matchingSkills.length / requiredSkillIds.length) * 40;

    // RELIABILITY SCORE (0-30)
    const reliabilityScore = (candidate.reliabilityScore / 100) * 30;

    //  TIMEZONE SCORE (0-20)
    const timezoneDiff = Math.abs(team.leader.timezoneOffset - candidate.timezoneOffset);
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

    // TOTAL SCORE (0-100)
    const score = Math.round(skillScore + reliabilityScore + timezoneScore + commitmentScore);

    return {
      candidate,
      score,
      breakdown: { skillScore, reliabilityScore, timezoneScore, commitmentScore }
    };
  });

  //sort highest score first
  return results.sort((a, b) => b.score - a.score);
};

export const calculateSingleMatch = async (
  teamId: string,
  userId: string
): Promise<number> => {
  
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { requiredSkills: true, leader: true }
  });
  if (!team) throw new Error('Team not found');

  const candidate = await prisma.user.findUnique({
    where: { id: userId },
    include: { skills: true }
  });
  if (!candidate) throw new Error('Candidate not found');

  // same exact logic as calculateMatches, just for one person
  const requiredSkillIds = team.requiredSkills.map(s => s.skillId);
  const candidateSkillIds = candidate.skills.map(s => s.skillId);
  const matchingSkills = requiredSkillIds.filter(id => candidateSkillIds.includes(id));
  const skillScore = requiredSkillIds.length === 0 ? 40 : (matchingSkills.length / requiredSkillIds.length) * 40;

  const reliabilityScore = (candidate.reliabilityScore / 100) * 30;

  const timezoneDiff = Math.abs(team.leader.timezoneOffset - candidate.timezoneOffset);
  const timezoneScore = Math.max(0, 20 - (timezoneDiff * 2));

  let commitmentScore = 0;
  if (team.leader.availability === candidate.availability) {
    commitmentScore = 10;
  } else if (
    (team.leader.availability === 'FULL_TIME' && candidate.availability === 'PART_TIME') ||
    (team.leader.availability === 'PART_TIME' && candidate.availability === 'FULL_TIME') ||
    (team.leader.availability === 'PART_TIME' && candidate.availability === 'WEEKENDS_ONLY') ||
    (team.leader.availability === 'WEEKENDS_ONLY' && candidate.availability === 'PART_TIME')
  ) {
    commitmentScore = 5;
  }

  return Math.round(skillScore + reliabilityScore + timezoneScore + commitmentScore);
};