import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateMatches } from '../algorithm/matching';

const prisma = new PrismaClient();

export const getMatches = async (req: Request, res: Response) => {
  const teamId = req.params.id as string;
  const userId = req.user?.id;

  try {
   
    const team = await prisma.team.findUnique({ where: { id: teamId } });       //team exists
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }


    if (team.leaderId !== userId) {
      return res.status(403).json({ message: 'Only the team leader can view matches' });    // requester is the leader
    }

   
    const matches = await calculateMatches(teamId);       //algo run
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
    
    const match = await prisma.match.findUnique({ where: { id: matchId } });                                         //match exists
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.receiverId !== userId) {                                                          //requester is the receiver
      return res.status(403).json({ message: 'Only the invited user can respond' });
    }

    if (match.status !== 'PENDING') {
      return res.status(400).json({ message: 'Invite already responded to' });
    }

    if (status === 'ACCEPTED') {                                                      
      const team = await prisma.team.findUnique({ where: { id: match.teamId } });                      
                                                                                                                      // if accepting, check team not full 
      const memberCount = await prisma.teamMember.count({ where: { teamId: match.teamId } });

      if (memberCount >= team!.maxSize) {
        return res.status(400).json({ message: 'Team is already full' });
      }

      // create TeamMember 
      await prisma.teamMember.create({
        data: { teamId: match.teamId, userId: userId! }
      });
    }

    
    const updatedMatch = await prisma.match.update({           //
      where: { id: matchId },
      data: { status }
    });

    res.status(200).json({ message: `Invite ${status}`, match: updatedMatch });

  } catch (error) {
    res.status(500).json({ message: 'Error responding to invite' });
  }
};