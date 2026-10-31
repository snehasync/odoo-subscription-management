import { Router } from 'express';
import { recordPayment, listPayments } from '../controllers/payment.controller';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireStaffOrAdmin);

router.get('/', listPayments);
router.post('/', recordPayment);

export default router;
