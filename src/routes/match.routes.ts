import { Router } from 'express';
import { respondToInvite } from '../controllers/match.controller';
import { protect } from '../middleware/protect';

const router = Router();

router.patch('/:id/respond', protect, respondToInvite);

export default router;
