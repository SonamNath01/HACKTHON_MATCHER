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