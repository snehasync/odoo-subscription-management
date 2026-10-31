import { Router } from 'express';
import { listTaxes, createTax, updateTax } from '../controllers/tax.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listTaxes);
router.post('/', requireAdmin, createTax);
router.put('/:id', requireAdmin, updateTax);

export default router;
