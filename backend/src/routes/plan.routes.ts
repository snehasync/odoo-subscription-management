import { Router } from 'express';
import { listPlans, createPlan, updatePlan } from '../controllers/plan.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listPlans);
router.post('/', requireAdmin, createPlan);
router.put('/:id', requireAdmin, updatePlan);

export default router;
