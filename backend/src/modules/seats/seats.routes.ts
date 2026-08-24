import { Router } from 'express';
import { SeatsController } from './seats.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/:id/seatmap', SeatsController.getSeatMap);
router.post('/:id/seats/:seatId/hold', SeatsController.holdSeat);
router.post('/:id/seats/:seatId/release', SeatsController.releaseSeat);

export default router;
