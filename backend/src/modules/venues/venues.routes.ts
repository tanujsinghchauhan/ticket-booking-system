import { Router } from 'express';
import { VenuesController } from './venues.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { roleMiddleware } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['ADMIN']), VenuesController.createVenue);
router.post('/:id/categories', roleMiddleware(['ADMIN']), VenuesController.createCategory);
router.post('/:id/seats/bulk', roleMiddleware(['ADMIN']), VenuesController.bulkCreateSeats);

router.get('/', VenuesController.listVenues);
router.get('/:id', VenuesController.getVenue);

export default router;
