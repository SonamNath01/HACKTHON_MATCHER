import { Router } from 'express';
import { protect } from '../middleware/protect';
import { createTeam, getTeam, getAllTeams, inviteToTeam, updateTeamStatus, getMyTeams } from '../controllers/team.controller';
import { getMatches } from '../controllers/match.controller';

const router = Router();

router.use(protect);

router.post('/', createTeam);
router.get('/my', getMyTeams);      
router.get('/:id', getTeam);
router.get('/', getAllTeams);
router.post('/:id/invite', inviteToTeam);
router.patch('/:id/status', updateTeamStatus);
router.get('/:id/matches', getMatches);

export default router;