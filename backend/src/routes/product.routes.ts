import { Router } from 'express';
import { listProducts, createProduct, updateProduct, addVariant, deleteVariant } from '../controllers/product.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listProducts);
router.post('/', requireAdmin, createProduct);
router.put('/:id', requireAdmin, updateProduct);
router.post('/:id/variants', requireAdmin, addVariant);
router.delete('/variants/:variantId', requireAdmin, deleteVariant);

export default router;
