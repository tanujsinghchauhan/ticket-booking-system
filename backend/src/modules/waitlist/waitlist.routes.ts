import { Router } from 'express';
import { WaitlistController } from './waitlist.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { roleMiddleware } from '../../middleware/role.middleware.js';

const router = Router();

router.get('/claim', WaitlistController.claim);
router.post('/join', authMiddleware, roleMiddleware(['CUSTOMER']), WaitlistController.join);

export default router;
