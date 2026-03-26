import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const createTeam = async (req: Request, res: Response) => {
  const { name, hackathonName, requiredSkills } = req.body;
  const userId = req.user?.id;

  try {
    const team = await prisma.team.create({
      data: {
        name,
        hackathonName,
        leaderId: userId!,
        requiredSkills: {
          create: requiredSkills.map((skillId: string) => ({ skillId }))
        }
      },
  
      include: {
        requiredSkills: {
          include: { skill: true }
        }
      }
    });

    // Leader automatically becomes a team member
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: userId!,
      }
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
        requiredSkills: {
          include: { skill: true }
        },
        members: true
      }
    });
    res.status(200).json({ teams });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teams' });
  }
};
export const getTeam = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        requiredSkills: {
          include: { skill: true }
        },
        members: {
          include: { user: true }  //  need member names
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
        members: {
          some: { userId }
        }
      },  
      include: {
        requiredSkills: {
          include: { skill: true }
        }, 
        members: {
          include: { user: true }
        }
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
    // check team exists
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    //  check requester is the leader
    if (team.leaderId !== userId) {
      return res.status(403).json({ message: 'Only the team leader can update status' });
    }

    // update the status
    const updatedTeam = await prisma.team.update({
      where: { id },
      data: { status }
    });

    //  if submitted, reward all members with reliability score
    if (status === 'SUBMITTED') {
      const members = await prisma.teamMember.findMany({ where: { teamId: id } });

      for (const member of members) {
        await prisma.user.update({
          where: { id: member.userId },
          data: { reliabilityScore: { increment: 10 } }
        });
      }
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
    //team exists?
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    //requester is the leader?
    if (team.leaderId !== userId) {
      return res.status(403).json({ message: 'Only the team leader can invite members' });
    }

    //  candidate exists?
    const candidate = await prisma.user.findUnique({ where: { email } });
    if (!candidate) {
      return res.status(404).json({ message: 'User not found' });
    }

    //  candidate already a member?
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: candidate.id } }
    });
    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    //  team full?
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

    //  create the pending invite
    const match = await prisma.match.create({
      data: {
        teamId,
        senderId: userId!,
        receiverId: candidate.id,
        score: 0,
        status: 'PENDING'
      }
    });

    res.status(201).json({ message: 'Invite sent successfully', match });

  } catch (error) {
    res.status(500).json({ message: 'Error sending invite' });
  }
};