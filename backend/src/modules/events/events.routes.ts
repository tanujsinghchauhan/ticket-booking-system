import { Router } from 'express';
import { EventsController } from './events.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { roleMiddleware } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['ORGANISER', 'ADMIN']), EventsController.createEvent);
router.post('/:id/shows', roleMiddleware(['ORGANISER', 'ADMIN']), EventsController.createShow);
router.get('/', EventsController.listEvents);
router.get('/:id', EventsController.getEvent);

export default router;
