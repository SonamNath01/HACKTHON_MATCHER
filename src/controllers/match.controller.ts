import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateMatches } from '../algorithm/matching';

const prisma = new PrismaClient();

export const getMatches = async (req: Request, res: Response) => {
  const teamId = req.params.id as string;
  const userId = req.user?.id;

  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.leaderId !== userId) {
      return res.status(403).json({ message: 'Only the team leader can view matches' });
    }

    const matches = await calculateMatches(teamId);
    res.status(200).json({ matches });

  } catch (error) {
    res.status(500).json({ message: 'Error calculating matches' });
  }
};

export const respondToInvite = async (req: Request, res: Response) => {
  const matchId = req.params.id as string;
  const userId = req.user?.id;
  const { status } = req.body as { status: 'ACCEPTED' | 'REJECTED' };

  try {
    // match exists?
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // requester is the receiver?
    if (match.receiverId !== userId) {
      return res.status(403).json({ message: 'Only the invited user can respond' });
    }

    // already responded?
    if (match.status !== 'PENDING') {
      return res.status(400).json({ message: 'Invite already responded to' });
    }

    if (status === 'REJECTED') {
      await prisma.$transaction([
        prisma.match.update({
          where: { id: matchId },
          data: { status }
        })
      ]);
    }

    if (status === 'ACCEPTED') {
      // team still exists?
      const team = await prisma.team.findUnique({ where: { id: match.teamId } });
      if (!team) {
        return res.status(404).json({ message: 'Team no longer exists' });
      }

      // team full?
      const memberCount = await prisma.teamMember.count({ where: { teamId: match.teamId } });
      if (memberCount >= team.maxSize) {
        return res.status(400).json({ message: 'Team is already full' });
      }

      // all three operations succeed or none do
      await prisma.$transaction([
        prisma.match.update({
          where: { id: matchId },
          data: { status }
        }),
        prisma.teamMember.create({
          data: { teamId: match.teamId, userId: userId! }
        }),
        prisma.notification.create({
          data: {
            userId: match.senderId,
            message: `Your invite to join team ${team.name} was accepted!`
          }
        })
      ]);
    }

    res.status(200).json({ message: `Invite ${status}` });

  } catch (error) {
    res.status(500).json({ message: 'Error responding to invite' });
  }
};