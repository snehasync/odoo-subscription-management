import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Money } from '../utils/money';
import { createAuditLog } from '../services/audit.service';

export async function listTaxes(req: Request, res: Response) {
  try {
    const { activeOnly = 'false' } = req.query;
    const where: any = {};
    if (activeOnly === 'true') {
      where.active = true;
    }

    const taxes = await prisma.taxRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: taxes });
  } catch (err: any) {
    console.error('ListTaxes error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch taxes' } });
  }
}

export async function createTax(req: Request, res: Response) {
  try {
    const { name, ratePercent, appliesToType = 'ALL' } = req.body;

    if (!name || ratePercent === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Tax name and rate percentage are required.' },
      });
    }

    const cleanRate = Money.round(ratePercent);

    const tax = await prisma.taxRule.create({
      data: {
        name: name.trim(),
        ratePercent: cleanRate,
        appliesToType,
        active: true,
      },
    });

    await createAuditLog(req, 'TAX_RULE_CREATED', 'TaxRule', tax.id, { name: tax.name, ratePercent: cleanRate });

    return res.status(201).json({ success: true, data: tax });
  } catch (err: any) {
    console.error('CreateTax error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create tax rule' } });
  }
}

export async function updateTax(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, ratePercent, appliesToType, active } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (ratePercent !== undefined) data.ratePercent = Money.round(ratePercent);
    if (appliesToType !== undefined) data.appliesToType = appliesToType;
    if (active !== undefined) data.active = Boolean(active);

    const tax = await prisma.taxRule.update({
      where: { id },
      data,
    });

    await createAuditLog(req, 'TAX_RULE_UPDATED', 'TaxRule', tax.id, data);

    return res.json({ success: true, data: tax });
  } catch (err: any) {
    console.error('UpdateTax error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update tax rule' } });
  }
}
