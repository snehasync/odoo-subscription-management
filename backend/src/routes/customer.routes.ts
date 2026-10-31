import { Router } from 'express';
import { listCustomers, createCustomer, updateCustomer } from '../controllers/customer.controller';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireStaffOrAdmin);

router.get('/', listCustomers);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);

export default router;
