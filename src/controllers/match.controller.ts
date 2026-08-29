import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateMatches, calculateTeamMatches, calculateSingleMatchDetailed } from '../algorithm/matching';

// Fields safe to return to any authenticated caller — deliberately excludes
// the password hash.
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

// All of the current user's pending invitations (sent to them by a team
// leader), across every team — used by the dashboard so a user doesn't have
// to open each team individually to see what they've been invited to. Scoped
// to type: 'INVITATION' so a candidate's own pending join requests (same
// receiverId, different type) don't show up here mislabeled as an invite —
// see getMyPendingJoinRequests for those.
export const getMyPendingInvites = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    const invites = await prisma.match.findMany({
      where: { receiverId: userId, status: 'PENDING', type: 'INVITATION' },
      include: { team: { include: { hackathon: true, leader: { select: SAFE_USER_SELECT } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ invites });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invites' });
  }
};

// The candidate's-eye view of their own sent join requests still awaiting a
// leader's decision — the counterpart to getMyPendingInvites.
export const getMyPendingJoinRequests = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    const requests = await prisma.match.findMany({
      where: { senderId: userId, status: 'PENDING', type: 'JOIN_REQUEST' },
      include: { team: { include: { hackathon: true, leader: { select: SAFE_USER_SELECT } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching join requests' });
  }
};

// The mirror image of getMatches: ranked FORMING teams for the current user
// to consider joining, instead of ranked candidates for a team. Each team
// also carries the caller's own match on it (if any), so the "Discover
// teams" UI can show "Request to join" vs "Pending" vs "Invited" without a
// second request per card.
export const getRecommendedTeams = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    const results = await calculateTeamMatches(userId!);

    const myMatches = await prisma.match.findMany({
      where: { receiverId: userId },
      select: { teamId: true, type: true, status: true },
    });
    const myMatchByTeam = new Map(myMatches.map(m => [m.teamId, m]));

    const teams = results.map(r => ({
      ...r,
      myMatch: myMatchByTeam.get(r.team.id) ?? null,
    }));

    res.status(200).json({ teams });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recommended teams' });
  }
};

// A live preview of "how would I score against this team" — used by the
// Team Details page to show a candidate their own compatibility before they
// send a join request, without them having to be invited first.
export const getMyTeamMatch = async (req: Request, res: Response) => {
  const teamId = req.params.id as string;
  const userId = req.user?.id;

  try {
    const result = await calculateSingleMatchDetailed(teamId, userId!);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Team not found') {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.status(500).json({ message: 'Error calculating match' });
  }
};

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

// Handles both directions with one function, since both are just "someone
// answering the other side of a Match":
//   INVITATION   — only the invited candidate (match.receiverId) may respond
//   JOIN_REQUEST — only the team leader may respond
export const respondToInvite = async (req: Request, res: Response) => {
  const matchId = req.params.id as string;
  const userId = req.user?.id;
  const { status } = req.body as { status: 'ACCEPTED' | 'REJECTED' };

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { team: true },
    });
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const canRespond = match.type === 'JOIN_REQUEST'
      ? match.team.leaderId === userId
      : match.receiverId === userId;
    if (!canRespond) {
      return res.status(403).json({
        message: match.type === 'JOIN_REQUEST'
          ? 'Only the team leader can respond to this join request'
          : 'Only the invited user can respond'
      });
    }

    // already responded? (fast path — the exact-once guarantee against a
    // race between two responses is the conditional updates below)
    if (match.status !== 'PENDING') {
      return res.status(400).json({ message: 'This request has already been processed' });
    }

    if (status === 'REJECTED') {
      // Conditional update — only flips a row that's still PENDING. If a
      // double-click or two tabs both reach here, only the first actually
      // updates a row; the second sees count 0 instead of double-processing.
      const result = await prisma.match.updateMany({
        where: { id: matchId, status: 'PENDING' },
        data: { status }
      });
      if (result.count === 0) {
        return res.status(400).json({ message: 'This request has already been processed' });
      }
      await prisma.notification.create({
        data: {
          userId: match.senderId,
          message: match.type === 'JOIN_REQUEST'
            ? `Your request to join team "${match.team.name}" was declined.`
            : `Your invitation to join team "${match.team.name}" was declined.`
        }
      });
    }

    if (status === 'ACCEPTED') {
      try {
        // Re-check capacity and join inside one serializable transaction so
        // two concurrent accepts can't both squeeze past the maxSize check.
        await prisma.$transaction(async (tx) => {
          const team = await tx.team.findUnique({ where: { id: match.teamId } });
          if (!team) {
            throw new Error('TEAM_NOT_FOUND');
          }

          const memberCount = await tx.teamMember.count({ where: { teamId: match.teamId } });
          if (memberCount >= team.maxSize) {
            throw new Error('TEAM_FULL');
          }

          // Same compare-and-swap as the REJECTED branch: only one of two
          // concurrent Accept clicks can flip PENDING -> ACCEPTED. The loser
          // gets 0 rows updated instead of creating a second TeamMember.
          const updated = await tx.match.updateMany({
            where: { id: matchId, status: 'PENDING' },
            data: { status }
          });
          if (updated.count === 0) {
            throw new Error('ALREADY_PROCESSED');
          }

          // match.receiverId is always "the candidate" regardless of
          // direction, so this is correct for both an accepted invitation
          // and an accepted join request.
          await tx.teamMember.create({
            data: { teamId: match.teamId, userId: match.receiverId }
          });
          await tx.notification.create({
            data: {
              userId: match.senderId,
              message: match.type === 'JOIN_REQUEST'
                ? `Your request to join team ${team.name} was accepted!`
                : `Your invite to join team ${team.name} was accepted!`
            }
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (txError) {
        if (txError instanceof Error && txError.message === 'TEAM_NOT_FOUND') {
          return res.status(404).json({ message: 'Team no longer exists' });
        }
        if (txError instanceof Error && txError.message === 'TEAM_FULL') {
          return res.status(400).json({ message: 'This team is now full' });
        }
        if (txError instanceof Error && txError.message === 'ALREADY_PROCESSED') {
          return res.status(400).json({ message: 'This request has already been processed' });
        }
        // Two accepts of the same row racing past the PENDING check above
        // (extremely tight timing) can still collide on the TeamMember
        // unique constraint — treat it the same as "already processed".
        if (txError instanceof Prisma.PrismaClientKnownRequestError && txError.code === 'P2002') {
          return res.status(400).json({ message: 'This request has already been processed' });
        }
        // Serializable write-conflict: someone else joined at the same instant.
        if (txError instanceof Prisma.PrismaClientKnownRequestError && txError.code === 'P2034') {
          return res.status(409).json({ message: 'Team filled up just now, please try again' });
        }
        throw txError;
      }
    }

    res.status(200).json({ message: `Request ${status}` });

  } catch (error) {
    res.status(500).json({ message: 'Error responding to request' });
  }
};
