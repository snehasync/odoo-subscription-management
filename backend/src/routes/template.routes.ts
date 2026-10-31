import { Router } from 'express';
import { listTemplates, createTemplate, updateTemplate, deleteTemplate } from '../controllers/template.controller';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listTemplates);
router.post('/', requireStaffOrAdmin, createTemplate);
router.put('/:id', requireStaffOrAdmin, updateTemplate);
router.delete('/:id', requireStaffOrAdmin, deleteTemplate);

export default router;
