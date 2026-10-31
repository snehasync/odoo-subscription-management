import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Money } from '../utils/money';
import { createAuditLog } from '../services/audit.service';

export async function listPlans(req: Request, res: Response) {
  try {
    const { activeOnly = 'false', period } = req.query;

    const where: any = {};
    if (activeOnly === 'true') {
      where.active = true;
    }
    if (period && typeof period === 'string' && period !== 'ALL') {
      where.billingPeriod = period;
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: plans });
  } catch (err: any) {
    console.error('ListPlans error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch plans' } });
  }
}

export async function createPlan(req: Request, res: Response) {
  try {
    const {
      name,
      code,
      price,
      billingPeriod = 'MONTHLY',
      minQuantity = 1,
      availableFrom,
      availableTo,
      autoCloseAtEndDate = false,
      allowEarlyClose = true,
      allowPause = true,
      allowRenewal = true,
    } = req.body;

    if (!name || !code || price === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Plan name, unique code, and price are required.' },
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await prisma.plan.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'CODE_EXISTS', message: `Plan code "${cleanCode}" is already taken.` },
      });
    }

    const fromDate = availableFrom ? new Date(availableFrom) : new Date();
    const toDate = availableTo ? new Date(availableTo) : new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years default

    const plan = await prisma.plan.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        price: Money.round(price),
        billingPeriod,
        minQuantity: Math.max(1, parseInt(minQuantity, 10) || 1),
        availableFrom: fromDate,
        availableTo: toDate,
        autoCloseAtEndDate: Boolean(autoCloseAtEndDate),
        allowEarlyClose: Boolean(allowEarlyClose),
        allowPause: Boolean(allowPause),
        allowRenewal: Boolean(allowRenewal),
        active: true,
      },
    });

    await createAuditLog(req, 'PLAN_CREATED', 'Plan', plan.id, { name: plan.name, code: plan.code });

    return res.status(201).json({ success: true, data: plan });
  } catch (err: any) {
    console.error('CreatePlan error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create plan' } });
  }
}

export async function updatePlan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      billingPeriod,
      minQuantity,
      availableFrom,
      availableTo,
      autoCloseAtEndDate,
      allowEarlyClose,
      allowPause,
      allowRenewal,
      active,
    } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (price !== undefined) data.price = Money.round(price);
    if (billingPeriod !== undefined) data.billingPeriod = billingPeriod;
    if (minQuantity !== undefined) data.minQuantity = Math.max(1, parseInt(minQuantity, 10) || 1);
    if (availableFrom !== undefined) data.availableFrom = new Date(availableFrom);
    if (availableTo !== undefined) data.availableTo = new Date(availableTo);
    if (autoCloseAtEndDate !== undefined) data.autoCloseAtEndDate = Boolean(autoCloseAtEndDate);
    if (allowEarlyClose !== undefined) data.allowEarlyClose = Boolean(allowEarlyClose);
    if (allowPause !== undefined) data.allowPause = Boolean(allowPause);
    if (allowRenewal !== undefined) data.allowRenewal = Boolean(allowRenewal);
    if (active !== undefined) data.active = Boolean(active);

    const plan = await prisma.plan.update({
      where: { id },
      data,
    });

    await createAuditLog(req, 'PLAN_UPDATED', 'Plan', plan.id, data);

    return res.json({ success: true, data: plan });
  } catch (err: any) {
    console.error('UpdatePlan error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update plan' } });
  }
}
