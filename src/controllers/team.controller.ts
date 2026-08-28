import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateSingleMatch } from '../algorithm/matching';

// Safety cap for unbounded list endpoints.
const MAX_TEAMS = 100;

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
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        requiredSkills: { include: { skill: true } },
        members: { include: { user: true } },
        hackathon: true,
        // Only the requesting user's own invite for this team — never expose
        // other candidates' invites/scores to someone viewing the team.
        matches: { where: { receiverId: userId } }
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
        members: { include: { user: true } },
        hackathon: true
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

    // already invited?
    const existingInvite = await prisma.match.findUnique({
      where: { teamId_receiverId: { teamId, receiverId: candidate.id } }
    });
    if (existingInvite) {
      return res.status(400).json({ message: 'User already invited' });
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
