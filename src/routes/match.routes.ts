import { Router } from 'express';
import {
  respondToInvite,
  getMyPendingInvites,
  getMyPendingJoinRequests,
  getRecommendedTeams,
} from '../controllers/match.controller';
import { protect } from '../middleware/protect';

const router = Router();

router.get('/my', protect, getMyPendingInvites);
router.get('/my/join-requests', protect, getMyPendingJoinRequests);
router.get('/teams', protect, getRecommendedTeams);
router.patch('/:id/respond', protect, respondToInvite);

export default router;
