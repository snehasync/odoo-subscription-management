import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Money } from '../utils/money';
import { createAuditLog } from '../services/audit.service';

export async function listDiscounts(req: Request, res: Response) {
  try {
    const discounts = await prisma.discount.findMany({
      include: {
        appliesToProduct: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: discounts });
  } catch (err: any) {
    console.error('ListDiscounts error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch discounts' } });
  }
}

export async function createDiscount(req: Request, res: Response) {
  try {
    const {
      code,
      type = 'PERCENTAGE',
      value,
      minPurchase = 0,
      minQuantity = 0,
      startDate,
      endDate,
      maxUsageCount = 0,
      appliesToProductId,
    } = req.body;

    if (!code || value === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Discount code and value are required.' },
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await prisma.discount.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'CODE_EXISTS', message: `Discount code "${cleanCode}" already exists.` },
      });
    }

    const sDate = startDate ? new Date(startDate) : new Date();
    const eDate = endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default

    const discount = await prisma.discount.create({
      data: {
        code: cleanCode,
        type,
        value: Money.round(value),
        minPurchase: Money.round(minPurchase),
        minQuantity: parseInt(minQuantity, 10) || 0,
        startDate: sDate,
        endDate: eDate,
        maxUsageCount: parseInt(maxUsageCount, 10) || 0,
        usageCount: 0,
        appliesToProductId: appliesToProductId || null,
        active: true,
      },
      include: { appliesToProduct: true },
    });

    await createAuditLog(req, 'DISCOUNT_CREATED', 'Discount', discount.id, {
      code: discount.code,
      type: discount.type,
      value: discount.value,
    });

    return res.status(201).json({ success: true, data: discount });
  } catch (err: any) {
    console.error('CreateDiscount error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create discount' } });
  }
}

export async function updateDiscount(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { value, minPurchase, minQuantity, startDate, endDate, maxUsageCount, active } = req.body;

    const data: any = {};
    if (value !== undefined) data.value = Money.round(value);
    if (minPurchase !== undefined) data.minPurchase = Money.round(minPurchase);
    if (minQuantity !== undefined) data.minQuantity = parseInt(minQuantity, 10) || 0;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (maxUsageCount !== undefined) data.maxUsageCount = parseInt(maxUsageCount, 10) || 0;
    if (active !== undefined) data.active = Boolean(active);

    const discount = await prisma.discount.update({
      where: { id },
      data,
      include: { appliesToProduct: true },
    });

    await createAuditLog(req, 'DISCOUNT_UPDATED', 'Discount', discount.id, data);

    return res.json({ success: true, data: discount });
  } catch (err: any) {
    console.error('UpdateDiscount error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update discount' } });
  }
}

export async function validateDiscountCode(req: Request, res: Response) {
  try {
    const { code, subtotal = 0, totalQuantity = 0, productId } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CODE', message: 'Discount code is required.' },
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const discount = await prisma.discount.findUnique({
      where: { code: cleanCode },
      include: { appliesToProduct: true },
    });

    if (!discount || !discount.active) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVALID_DISCOUNT', message: 'Invalid or inactive discount code.' },
      });
    }

    const now = new Date();
    if (discount.startDate > now) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_STARTED', message: 'This discount code is not yet active.' },
      });
    }

    if (discount.endDate < now) {
      return res.status(400).json({
        success: false,
        error: { code: 'EXPIRED', message: 'This discount code has expired.' },
      });
    }

    if (discount.maxUsageCount > 0 && discount.usageCount >= discount.maxUsageCount) {
      return res.status(400).json({
        success: false,
        error: { code: 'USAGE_LIMIT_REACHED', message: 'This discount code has reached its maximum usage limit.' },
      });
    }

    if (discount.minPurchase > 0 && subtotal < discount.minPurchase) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MIN_PURCHASE_NOT_MET',
          message: `Minimum purchase of $${discount.minPurchase.toFixed(2)} required for this discount.`,
        },
      });
    }

    if (discount.minQuantity > 0 && totalQuantity < discount.minQuantity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MIN_QUANTITY_NOT_MET',
          message: `Minimum quantity of ${discount.minQuantity} items required for this discount.`,
        },
      });
    }

    if (discount.appliesToProductId && productId && discount.appliesToProductId !== productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PRODUCT_MISMATCH',
          message: `This discount only applies to product "${discount.appliesToProduct?.name}".`,
        },
      });
    }

    // Calculate discount amount
    let calculatedDiscount = 0;
    if (discount.type === 'PERCENTAGE') {
      calculatedDiscount = Money.calcPercentage(subtotal, discount.value);
    } else {
      calculatedDiscount = Math.min(discount.value, subtotal);
    }

    return res.json({
      success: true,
      data: {
        discount,
        calculatedDiscount: Money.round(calculatedDiscount),
      },
    });
  } catch (err: any) {
    console.error('ValidateDiscount error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Discount validation failed' } });
  }
}
