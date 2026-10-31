import { Router } from 'express';
import {
  getPortalProfile,
  getPortalSubscriptions,
  getPortalInvoices,
  payPortalInvoice,
  changePortalPassword,
} from '../controllers/portal.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/profile', getPortalProfile);
router.get('/subscriptions', getPortalSubscriptions);
router.get('/invoices', getPortalInvoices);
router.post('/invoices/:id/pay', payPortalInvoice);
router.post('/change-password', changePortalPassword);

export default router;
