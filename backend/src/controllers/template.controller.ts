import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Money } from '../utils/money';
import { createAuditLog } from '../services/audit.service';

export async function listTemplates(req: Request, res: Response) {
  try {
    const templates = await prisma.quotationTemplate.findMany({
      include: {
        lines: {
          include: {
            product: { include: { variants: true } },
            variant: true,
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: templates });
  } catch (err: any) {
    console.error('ListTemplates error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch quotation templates' } });
  }
}

export async function createTemplate(req: Request, res: Response) {
  try {
    const { name, validityDays = 30, notes, lines = [] } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Template name is required.' },
      });
    }

    const template = await prisma.quotationTemplate.create({
      data: {
        name: name.trim(),
        validityDays: parseInt(validityDays, 10) || 30,
        notes: notes || null,
        ...(Array.isArray(lines) && lines.length > 0 && {
          lines: {
            create: lines.map((line: any) => ({
              productId: line.productId,
              variantId: line.variantId || null,
              planId: line.planId || null,
              quantity: Math.max(1, parseInt(line.quantity, 10) || 1),
              unitPrice: Money.round(line.unitPrice || 0),
              notes: line.notes || null,
            })),
          },
        }),
      },
      include: {
        lines: {
          include: { product: true, variant: true, plan: true },
        },
      },
    });

    await createAuditLog(req, 'TEMPLATE_CREATED', 'QuotationTemplate', template.id, { name: template.name });

    return res.status(201).json({ success: true, data: template });
  } catch (err: any) {
    console.error('CreateTemplate error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create quotation template' } });
  }
}

export async function updateTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, validityDays, notes, lines } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (validityDays !== undefined) data.validityDays = parseInt(validityDays, 10) || 30;
    if (notes !== undefined) data.notes = notes;

    // If lines provided, replace existing lines
    if (Array.isArray(lines)) {
      await prisma.quotationTemplateLine.deleteMany({ where: { templateId: id } });
      data.lines = {
        create: lines.map((line: any) => ({
          productId: line.productId,
          variantId: line.variantId || null,
          planId: line.planId || null,
          quantity: Math.max(1, parseInt(line.quantity, 10) || 1),
          unitPrice: Money.round(line.unitPrice || 0),
          notes: line.notes || null,
        })),
      };
    }

    const template = await prisma.quotationTemplate.update({
      where: { id },
      data,
      include: {
        lines: { include: { product: true, variant: true, plan: true } },
      },
    });

    await createAuditLog(req, 'TEMPLATE_UPDATED', 'QuotationTemplate', template.id);

    return res.json({ success: true, data: template });
  } catch (err: any) {
    console.error('UpdateTemplate error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update quotation template' } });
  }
}

export async function deleteTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.quotationTemplate.delete({ where: { id } });
    await createAuditLog(req, 'TEMPLATE_DELETED', 'QuotationTemplate', id);
    return res.json({ success: true, message: 'Template deleted.' });
  } catch (err: any) {
    console.error('DeleteTemplate error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete template' } });
  }
}
