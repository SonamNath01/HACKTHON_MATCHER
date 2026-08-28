import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateMatches } from '../algorithm/matching';

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
      await prisma.match.update({
        where: { id: matchId },
        data: { status }
      });
    }

    if (status === 'ACCEPTED') {
      try {
        // Re-check capacity and join inside one serializable transaction so two
        // concurrent accepts can't both squeeze past the maxSize check.
        await prisma.$transaction(async (tx) => {
          const team = await tx.team.findUnique({ where: { id: match.teamId } });
          if (!team) {
            throw new Error('TEAM_NOT_FOUND');
          }

          const memberCount = await tx.teamMember.count({ where: { teamId: match.teamId } });
          if (memberCount >= team.maxSize) {
            throw new Error('TEAM_FULL');
          }

          await tx.match.update({
            where: { id: matchId },
            data: { status }
          });
          await tx.teamMember.create({
            data: { teamId: match.teamId, userId: userId! }
          });
          await tx.notification.create({
            data: {
              userId: match.senderId,
              message: `Your invite to join team ${team.name} was accepted!`
            }
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (txError) {
        if (txError instanceof Error && txError.message === 'TEAM_NOT_FOUND') {
          return res.status(404).json({ message: 'Team no longer exists' });
        }
        if (txError instanceof Error && txError.message === 'TEAM_FULL') {
          return res.status(400).json({ message: 'Team is already full' });
        }
        // Serializable write-conflict: someone else joined at the same instant.
        if (txError instanceof Prisma.PrismaClientKnownRequestError && txError.code === 'P2034') {
          return res.status(409).json({ message: 'Team filled up just now, please try again' });
        }
        throw txError;
      }
    }

    res.status(200).json({ message: `Invite ${status}` });

  } catch (error) {
    res.status(500).json({ message: 'Error responding to invite' });
  }
};
