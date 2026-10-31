import { Router } from 'express';
import { getDashboardStats, exportReportCsv, listAuditLogs } from '../controllers/report.controller';
import { authenticate, requireStaffOrAdmin, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', requireStaffOrAdmin, getDashboardStats);
router.get('/export-csv', requireStaffOrAdmin, exportReportCsv);
router.get('/audit-logs', requireAdmin, listAuditLogs);

export default router;
