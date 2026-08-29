import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateSingleMatch } from '../algorithm/matching';

// Safety cap for unbounded list endpoints.
const MAX_TEAMS = 100;

// Fields safe to return to any authenticated caller viewing a team/invite —
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

export const createTeam = async (req: Request, res: Response) => {
  const { name, description, hackathonId, requiredSkills } = req.body;
  const userId = req.user?.id;

  try {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) {
      return res.status(404).json({ message: 'Hackathon not found' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        hackathonId,
        leaderId: userId!,
        requiredSkills: {
          create: requiredSkills.map((skillId: string) => ({ skillId }))
        }
      },
      include: {
        requiredSkills: { include: { skill: true } },
        hackathon: true
      }
    });

    await prisma.teamMember.create({
      data: { teamId: team.id, userId: userId! }
    });

    res.status(201).json({ team });

  } catch (error) {
    res.status(500).json({ message: 'Error creating team' });
  }
};

export const getAllTeams = async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        requiredSkills: { include: { skill: true } },
        members: true,
        hackathon: true
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_TEAMS
    });
    res.status(200).json({ teams });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teams' });
  }
};

export const getTeam = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id;
  try {
    // Look up just the leaderId first so we know whether the requester is
    // allowed to see every pending invite on the team, or only their own.
    const teamMeta = await prisma.team.findUnique({ where: { id }, select: { leaderId: true } });
    if (!teamMeta) {
      return res.status(404).json({ message: 'Team not found' });
    }
    const isLeader = teamMeta.leaderId === userId;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        requiredSkills: { include: { skill: true } },
        members: {
          include: { user: { select: { ...SAFE_USER_SELECT, skills: { include: { skill: true } } } } }
        },
        hackathon: true,
        // The leader can see every pending invite (to show who's been asked
        // and hasn't responded yet); everyone else only sees their own invite
        // — never expose another candidate's invite/score to a team member.
        matches: {
          where: isLeader ? { status: 'PENDING' } : { receiverId: userId },
          include: { receiver: { select: { ...SAFE_USER_SELECT, skills: { include: { skill: true } } } } }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.status(200).json({ team });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching team' });
  }
};

export const getMyTeams = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  try {
    const teams = await prisma.team.findMany({
      where: {
        members: { some: { userId } }
      },
      include: {
        requiredSkills: { include: { skill: true } },
        members: { include: { user: { select: SAFE_USER_SELECT } } },
        hackathon: true,
        // Just the count-relevant id — the dashboard only needs "how many
        // invites are still pending", never who they were sent to.
        matches: { where: { status: 'PENDING' }, select: { id: true } }
      }
    });
    res.status(200).json({ teams });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your teams' });
  }
};

export const updateTeamStatus = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;
  const userId = req.user?.id;

  try {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.leaderId !== userId) {
      return res.status(403).json({ message: 'Only the team leader can update status' });
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: { status }
    });

    // Only apply a reliability adjustment on an actual transition, so
    // repeated status updates don't keep stacking the same delta.
    if (status === 'SUBMITTED' && team.status !== 'SUBMITTED') {
      // A team that actually submits is the strongest positive reliability
      // signal — bump every member in one statement instead of N round trips.
      await prisma.$executeRaw`
        UPDATE "User" u
        SET "reliabilityScore" = LEAST(100, u."reliabilityScore" + 10)
        FROM "TeamMember" tm
        WHERE tm."userId" = u.id AND tm."teamId" = ${id}
      `;
    } else if (status === 'DISBANDED' && team.status !== 'DISBANDED') {
      // A team that disbands without submitting is a mild negative signal
      // for everyone who was on it.
      await prisma.$executeRaw`
        UPDATE "User" u
        SET "reliabilityScore" = GREATEST(0, u."reliabilityScore" - 5)
        FROM "TeamMember" tm
        WHERE tm."userId" = u.id AND tm."teamId" = ${id}
      `;
    }

    res.status(200).json({ team: updatedTeam });

  } catch (error) {
    res.status(500).json({ message: 'Error updating team status' });
  }
};

export const inviteToTeam = async (req: Request, res: Response) => {
  const teamId = req.params.id as string;
  const { email } = req.body;
  const userId = req.user?.id;

  try {
    // team exists?
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { hackathon: true }
    });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // requester is the leader?
    if (team.leaderId !== userId) {
      return res.status(403).json({ message: 'Only the team leader can invite members' });
    }

    // candidate exists?
    const candidate = await prisma.user.findUnique({ where: { email } });
    if (!candidate) {
      return res.status(404).json({ message: 'User not found' });
    }

    // candidate already a member?
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: candidate.id } }
    });
    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // team full?
    const memberCount = await prisma.teamMember.count({ where: { teamId } });
    if (memberCount >= team.maxSize) {
      return res.status(400).json({ message: 'Team is already full' });
    }

    // already invited, or already has a pending join request on this team?
    // (the same [teamId, receiverId] row covers both — see the Match model comment)
    const existingInvite = await prisma.match.findUnique({
      where: { teamId_receiverId: { teamId, receiverId: candidate.id } }
    });
    if (existingInvite) {
      return res.status(400).json({
        message: existingInvite.type === 'JOIN_REQUEST'
          ? 'This user already asked to join — respond to their join request instead'
          : 'User already invited'
      });
    }

    // calculate score then create match + notification atomically
    const score = await calculateSingleMatch(teamId, candidate.id);

    await prisma.$transaction([
      prisma.match.create({
        data: {
          teamId,
          senderId: userId!,
          receiverId: candidate.id,
          score,
          status: 'PENDING'
        }
      }),
      prisma.notification.create({
        data: {
          userId: candidate.id,
          message: `You have been invited to join team "${team.name}" for hackathon "${team.hackathon.name}".`
        }
      })
    ]);

    res.status(201).json({ message: 'Invite sent successfully' });

  } catch (error) {
    // Two concurrent invites to the same candidate can both pass the
    // pre-check above and then collide on the unique (teamId, receiverId)
    // constraint — surface that as a clean 400 instead of a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(400).json({ message: 'User already invited' });
    }
    res.status(500).json({ message: 'Error sending invite' });
  }
};

// The other direction of team matching: a candidate asking to join a team,
// instead of a leader inviting them. Reuses the same Match model — this row
// looks exactly like an invite except type: 'JOIN_REQUEST' and
// senderId === receiverId (the candidate sent it to themselves, addressed at
// the team) — so every downstream piece of code that already reads
// Match.receiverId as "the candidate" keeps working unmodified.
export const requestToJoinTeam = async (req: Request, res: Response) => {
  const teamId = req.params.id as string;
  const userId = req.user?.id;

  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.status !== 'FORMING') {
      return res.status(400).json({ message: 'This team is not currently accepting join requests' });
    }

    // already a member?
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: userId! } }
    });
    if (existingMember) {
      return res.status(400).json({ message: 'You are already a member of this team' });
    }

    // team full?
    const memberCount = await prisma.teamMember.count({ where: { teamId } });
    if (memberCount >= team.maxSize) {
      return res.status(400).json({ message: 'This team is now full' });
    }

    // already invited, or already requested?
    const existingMatch = await prisma.match.findUnique({
      where: { teamId_receiverId: { teamId, receiverId: userId! } }
    });
    if (existingMatch) {
      return res.status(400).json({
        message: existingMatch.type === 'INVITATION'
          ? 'This team already invited you — check your invitations'
          : 'You already requested to join this team'
      });
    }

    const [candidate, score] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      calculateSingleMatch(teamId, userId!),
    ]);

    await prisma.$transaction([
      prisma.match.create({
        data: {
          teamId,
          senderId: userId!,
          receiverId: userId!,
          score,
          status: 'PENDING',
          type: 'JOIN_REQUEST',
        }
      }),
      prisma.notification.create({
        data: {
          userId: team.leaderId,
          message: `${candidate?.name || 'Someone'} requested to join your team "${team.name}".`
        }
      })
    ]);

    res.status(201).json({ message: 'Join request sent successfully' });

  } catch (error) {
    // Two rapid clicks (or two tabs) can both pass the pre-check above and
    // then collide on the same unique (teamId, receiverId) constraint used
    // by invites — surface that as a clean 400 instead of a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(400).json({ message: 'You already requested to join this team' });
    }
    res.status(500).json({ message: 'Error sending join request' });
  }
};
