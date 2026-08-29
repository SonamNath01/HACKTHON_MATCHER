import { Router } from 'express';
import { protect } from '../middleware/protect';
import {
  createTeam,
  getTeam,
  getAllTeams,
  inviteToTeam,
  updateTeamStatus,
  getMyTeams,
  requestToJoinTeam,
} from '../controllers/team.controller';
import { getMatches, getMyTeamMatch } from '../controllers/match.controller';

const router = Router();

router.use(protect);

router.post('/', createTeam);
router.get('/my', getMyTeams);
router.get('/:id', getTeam);
router.get('/', getAllTeams);
router.post('/:id/invite', inviteToTeam);
router.post('/:id/request-join', requestToJoinTeam);
router.patch('/:id/status', updateTeamStatus);
router.get('/:id/matches', getMatches);
router.get('/:id/my-match', getMyTeamMatch);

export default router;