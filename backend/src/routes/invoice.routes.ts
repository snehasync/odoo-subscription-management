import { Router } from 'express';
import {
  listInvoices,
  getInvoiceById,
  confirmInvoice,
  cancelInvoice,
  sendInvoice,
  generateDueInvoices,
  renderInvoiceHtml,
} from '../controllers/invoice.controller';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();

// Public/printable HTML invoice route (can use cookie auth or open with print token)
router.get('/:id/print', renderInvoiceHtml);

router.use(authenticate);

router.get('/', requireStaffOrAdmin, listInvoices);
router.get('/:id', getInvoiceById);
router.post('/:id/confirm', requireStaffOrAdmin, confirmInvoice);
router.post('/:id/cancel', requireStaffOrAdmin, cancelInvoice);
router.post('/:id/send', requireStaffOrAdmin, sendInvoice);
router.post('/generate-due', requireStaffOrAdmin, generateDueInvoices);

export default router;
