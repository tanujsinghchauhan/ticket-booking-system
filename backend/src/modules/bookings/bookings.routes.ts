import { Router } from 'express';
import { BookingsController } from './bookings.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/confirm', BookingsController.confirm);
router.post('/:id/cancel', BookingsController.cancel);
router.get('/me', BookingsController.me);

export default router;
