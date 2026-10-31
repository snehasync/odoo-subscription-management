import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Money } from '../utils/money';
import { createAuditLog } from '../services/audit.service';

// Valid status transitions map
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['QUOTATION', 'CLOSED'],
  QUOTATION: ['CONFIRMED', 'DRAFT', 'CLOSED'],
  CONFIRMED: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['CLOSED'],
  CLOSED: ['DRAFT', 'ACTIVE'], // Allowed only if plan allows renewal
};

/**
 * Generate human readable sequential subscription number: SUB-YYYY-XXXXX
 */
async function generateSubscriptionNumber(): Promise<string> {
  const count = await prisma.subscription.count();
  const year = new Date().getFullYear();
  return `SUB-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function listSubscriptions(req: Request, res: Response) {
  try {
    const { status, customerId, planId, search, page = '1', limit = '25' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }
    if (customerId && typeof customerId === 'string') {
      where.customerId = customerId;
    }
    if (planId && typeof planId === 'string') {
      where.planId = planId;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { subscriptionNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { email: { contains: search } } },
      ];
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take,
        include: {
          customer: true,
          plan: true,
          discount: true,
          _count: { select: { lines: true, invoices: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: subscriptions,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err: any) {
    console.error('ListSubscriptions error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch subscriptions' } });
  }
}

export async function getSubscriptionById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        discount: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, fullName: true, email: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          include: {
            payments: true,
          },
          orderBy: { issuedDate: 'desc' },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found.' },
      });
    }

    // Role check for customer portal: customer can only view their own subscription
    if (req.user?.role === 'CUSTOMER') {
      if (subscription.customerId !== req.user.customerId && subscription.customer.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied.' },
        });
      }
    }

    return res.json({ success: true, data: subscription });
  } catch (err: any) {
    console.error('GetSubscriptionById error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve subscription' } });
  }
}

export async function createSubscription(req: Request, res: Response) {
  try {
    const {
      customerId,
      planId,
      startDate,
      expiryDate,
      paymentTerms = 'NET30',
      discountId,
      notes,
      lines = [],
    } = req.body;

    if (!customerId || !planId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Customer and Plan are required.' },
      });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PLAN', message: 'Selected plan is inactive or does not exist.' },
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    // Default expiry: 1 year from start
    const expiry = expiryDate ? new Date(expiryDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
    const subscriptionNumber = await generateSubscriptionNumber();

    // Calculate line amounts
    const processedLines = lines.map((l: any) => {
      const qty = Math.max(1, parseInt(l.quantity, 10) || 1);
      const unit = Money.round(l.unitPrice || 0);
      const taxRate = Money.round(l.taxRate || 0);
      const amount = Money.multiply(qty, unit);
      return {
        productId: l.productId,
        variantId: l.variantId || null,
        quantity: qty,
        unitPrice: unit,
        taxRate,
        amount,
      };
    });

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber,
        customerId,
        planId,
        status: 'DRAFT',
        startDate: start,
        expiryDate: expiry,
        paymentTerms,
        nextBillingDate: start,
        discountId: discountId || null,
        notes: notes || null,
        lines: {
          create: processedLines,
        },
        statusHistory: {
          create: {
            fromStatus: 'NONE',
            toStatus: 'DRAFT',
            changedById: req.user?.userId || null,
            reason: 'Initial creation in DRAFT state',
          },
        },
      },
      include: {
        customer: true,
        plan: true,
        lines: { include: { product: true, variant: true } },
      },
    });

    await createAuditLog(req, 'SUBSCRIPTION_CREATED', 'Subscription', subscription.id, {
      subscriptionNumber: subscription.subscriptionNumber,
      customerId,
      planId,
    });

    return res.status(201).json({ success: true, data: subscription });
  } catch (err: any) {
    console.error('CreateSubscription error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create subscription' } });
  }
}

export async function createFromTemplate(req: Request, res: Response) {
  try {
    const { templateId, customerId, startDate, paymentTerms } = req.body;

    if (!templateId || !customerId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Template ID and Customer ID are required.' },
      });
    }

    const template = await prisma.quotationTemplate.findUnique({
      where: { id: templateId },
      include: {
        lines: { include: { product: true, variant: true, plan: true } },
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Quotation template not found.' },
      });
    }

    // Determine plan from template lines or pick default
    const lineWithPlan = template.lines.find((l) => l.planId);
    let planId = lineWithPlan?.planId;

    if (!planId) {
      const defaultPlan = await prisma.plan.findFirst({ where: { active: true } });
      if (!defaultPlan) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_PLAN', message: 'No active plan available to assign.' },
        });
      }
      planId = defaultPlan.id;
    }

    const start = startDate ? new Date(startDate) : new Date();
    const expiry = new Date(start.getTime() + template.validityDays * 24 * 60 * 60 * 1000);
    const subscriptionNumber = await generateSubscriptionNumber();

    const lines = template.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId || null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: 0,
      amount: Money.multiply(l.quantity, l.unitPrice),
    }));

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber,
        customerId,
        planId,
        status: 'QUOTATION',
        startDate: start,
        expiryDate: expiry,
        paymentTerms: paymentTerms || 'NET30',
        nextBillingDate: start,
        notes: `Created from Quotation Template: ${template.name}`,
        lines: {
          create: lines,
        },
        statusHistory: {
          create: {
            fromStatus: 'NONE',
            toStatus: 'QUOTATION',
            changedById: req.user?.userId || null,
            reason: `Created from template "${template.name}"`,
          },
        },
      },
      include: {
        customer: true,
        plan: true,
        lines: { include: { product: true, variant: true } },
      },
    });

    await createAuditLog(req, 'SUBSCRIPTION_CREATED_FROM_TEMPLATE', 'Subscription', subscription.id, {
      templateId,
      templateName: template.name,
    });

    return res.status(201).json({ success: true, data: subscription });
  } catch (err: any) {
    console.error('CreateFromTemplate error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create subscription from template' } });
  }
}

export async function transitionStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { toStatus, reason } = req.body;

    if (!toStatus) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Target status (toStatus) is required.' },
      });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found.' },
      });
    }

    const currentStatus = subscription.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(toStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition subscription from "${currentStatus}" to "${toStatus}". Allowed transitions: [${allowed.join(', ')}]`,
        },
      });
    }

    // Special rule: transition from CLOSED to DRAFT/ACTIVE requires plan.allowRenewal
    if (currentStatus === 'CLOSED' && (toStatus === 'ACTIVE' || toStatus === 'DRAFT')) {
      if (!subscription.plan.allowRenewal) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'RENEWAL_DISALLOWED',
            message: `Plan "${subscription.plan.name}" does not allow renewals on closed subscriptions.`,
          },
        });
      }
    }

    // Special rule: early close check
    if (toStatus === 'CLOSED' && currentStatus === 'ACTIVE') {
      const now = new Date();
      if (now < subscription.expiryDate && !subscription.plan.allowEarlyClose) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EARLY_CLOSE_DISALLOWED',
            message: `Plan "${subscription.plan.name}" does not permit early closure before expiry date.`,
          },
        });
      }
    }

    // Atomically update status and insert history
    const [updatedSub] = await prisma.$transaction([
      prisma.subscription.update({
        where: { id },
        data: { status: toStatus },
        include: {
          customer: true,
          plan: true,
          lines: true,
        },
      }),
      prisma.subscriptionStatusHistory.create({
        data: {
          subscriptionId: id,
          fromStatus: currentStatus,
          toStatus,
          changedById: req.user?.userId || null,
          reason: reason || `Status changed from ${currentStatus} to ${toStatus}`,
        },
      }),
    ]);

    await createAuditLog(req, 'SUBSCRIPTION_STATUS_TRANSITION', 'Subscription', id, {
      fromStatus: currentStatus,
      toStatus,
      reason,
    });

    return res.json({ success: true, data: updatedSub });
  } catch (err: any) {
    console.error('TransitionStatus error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update subscription status' } });
  }
}
