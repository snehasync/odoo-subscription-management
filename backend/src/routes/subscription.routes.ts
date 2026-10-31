import { Router } from 'express';
import {
  listSubscriptions,
  getSubscriptionById,
  createSubscription,
  createFromTemplate,
  transitionStatus,
} from '../controllers/subscription.controller';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listSubscriptions);
router.get('/:id', getSubscriptionById);
router.post('/', requireStaffOrAdmin, createSubscription);
router.post('/from-template', requireStaffOrAdmin, createFromTemplate);
router.post('/:id/transition', requireStaffOrAdmin, transitionStatus);

export default router;
