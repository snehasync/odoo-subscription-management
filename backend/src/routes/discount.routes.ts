import { Router } from 'express';
import { listDiscounts, createDiscount, updateDiscount, validateDiscountCode } from '../controllers/discount.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listDiscounts);
router.post('/', requireAdmin, createDiscount);
router.put('/:id', requireAdmin, updateDiscount);
router.post('/validate', validateDiscountCode);

export default router;
