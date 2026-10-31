import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Money } from '../utils/money';
import { Parser } from 'json2csv';

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const { startDate, endDate, customerId, planId } = req.query;

    const invoiceWhere: any = {};
    const subscriptionWhere: any = {};

    if (customerId && typeof customerId === 'string') {
      invoiceWhere.customerId = customerId;
      subscriptionWhere.customerId = customerId;
    }
    if (planId && typeof planId === 'string') {
      subscriptionWhere.planId = planId;
    }
    if (startDate || endDate) {
      invoiceWhere.issuedDate = {};
      if (startDate && typeof startDate === 'string') {
        invoiceWhere.issuedDate.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        invoiceWhere.issuedDate.lte = new Date(endDate);
      }
    }

    const now = new Date();

    // 1. High-performance aggregate queries
    const [
      activeSubscriptionsCount,
      subscriptionsByStatus,
      invoiceAggregates,
      overdueInvoices,
      recentPayments,
      activeSubsWithPlans,
    ] = await Promise.all([
      // Count active subscriptions
      prisma.subscription.count({
        where: { ...subscriptionWhere, status: 'ACTIVE' },
      }),

      // Group subscriptions by status
      prisma.subscription.groupBy({
        by: ['status'],
        _count: { id: true },
        where: subscriptionWhere,
      }),

      // Aggregate revenue and totals across invoices
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: {
          totalAmount: true,
          paidAmount: true,
          taxTotal: true,
          discountTotal: true,
        },
        _count: { id: true },
      }),

      // Overdue invoices (status not PAID and dueDate < now)
      prisma.invoice.findMany({
        where: {
          ...invoiceWhere,
          status: { notIn: ['PAID', 'CANCELLED'] },
          dueDate: { lt: now },
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          subscription: { select: { subscriptionNumber: true } },
        },
      }),

      // Recent payments summary
      prisma.payment.findMany({
        take: 8,
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),

      // For instant MRR/ARR: group active subscriptions by planId
      prisma.subscription.groupBy({
        by: ['planId'],
        _count: { id: true },
        where: { ...subscriptionWhere, status: 'ACTIVE' },
      }),
    ]);

    // Fetch plan details for active groups to compute MRR/ARR accurately
    const planIds = activeSubsWithPlans.map((p) => p.planId);
    const plans = await prisma.plan.findMany({
      where: { id: { in: planIds } },
    });
    const planMap = new Map(plans.map((p) => [p.id, p]));

    let calculatedMrr = 0;
    for (const group of activeSubsWithPlans) {
      const plan = planMap.get(group.planId);
      if (!plan) continue;

      let monthlyValue = plan.price;
      switch (plan.billingPeriod.toUpperCase()) {
        case 'DAILY':
          monthlyValue = plan.price * 30;
          break;
        case 'WEEKLY':
          monthlyValue = plan.price * 4.33;
          break;
        case 'YEARLY':
          monthlyValue = plan.price / 12;
          break;
        case 'MONTHLY':
        default:
          monthlyValue = plan.price;
          break;
      }
      calculatedMrr += monthlyValue * group._count.id;
    }

    const mrr = Money.round(calculatedMrr);
    const arr = Money.round(mrr * 12);

    const totalInvoiced = Money.round(invoiceAggregates._sum.totalAmount || 0);
    const revenueCollected = Money.round(invoiceAggregates._sum.paidAmount || 0);
    const amountOutstanding = Money.round(Math.max(0, totalInvoiced - revenueCollected));

    // Calculate overdue amount total
    const overdueAgg = await prisma.invoice.aggregate({
      where: {
        ...invoiceWhere,
        status: { notIn: ['PAID', 'CANCELLED'] },
        dueDate: { lt: now },
      },
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
      _count: { id: true },
    });
    const overdueTotal = Money.round(
      Math.max(0, (overdueAgg._sum.totalAmount || 0) - (overdueAgg._sum.paidAmount || 0))
    );

    // Group subscriptions by status into an object
    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      QUOTATION: 0,
      CONFIRMED: 0,
      ACTIVE: 0,
      CLOSED: 0,
    };
    for (const item of subscriptionsByStatus) {
      statusCounts[item.status] = item._count.id;
    }

    return res.json({
      success: true,
      data: {
        metrics: {
          activeSubscriptionsCount,
          totalSubscriptions: Object.values(statusCounts).reduce((a, b) => a + b, 0),
          revenueCollected,
          amountOutstanding,
          totalInvoiced,
          mrr,
          arr,
          overdueCount: overdueAgg._count.id,
          overdueAmount: overdueTotal,
        },
        statusDistribution: statusCounts,
        overdueInvoices: overdueInvoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customer.name,
          customerEmail: inv.customer.email,
          subscriptionNumber: inv.subscription?.subscriptionNumber || '-',
          dueDate: inv.dueDate,
          daysOverdue: Math.max(1, Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))),
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          balanceDue: Money.round(Math.max(0, inv.totalAmount - inv.paidAmount)),
        })),
        recentPayments: recentPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          paymentDate: p.paymentDate,
          invoiceNumber: p.invoice?.invoiceNumber || '-',
          customerName: p.invoice?.customer?.name || '-',
        })),
      },
    });
  } catch (err: any) {
    console.error('GetDashboardStats error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate dashboard report' } });
  }
}

export async function exportReportCsv(req: Request, res: Response) {
  try {
    const { type = 'invoices' } = req.query;

    if (type === 'subscriptions') {
      const subscriptions = await prisma.subscription.findMany({
        include: { customer: true, plan: true, discount: true },
        take: 5000,
        orderBy: { createdAt: 'desc' },
      });

      const fields = [
        { label: 'Subscription #', value: 'subscriptionNumber' },
        { label: 'Status', value: 'status' },
        { label: 'Customer Name', value: 'customer.name' },
        { label: 'Customer Email', value: 'customer.email' },
        { label: 'Plan Code', value: 'plan.code' },
        { label: 'Plan Name', value: 'plan.name' },
        { label: 'Plan Price', value: 'plan.price' },
        { label: 'Billing Period', value: 'plan.billingPeriod' },
        { label: 'Start Date', value: (row: any) => row.startDate.toISOString().slice(0, 10) },
        { label: 'Expiry Date', value: (row: any) => row.expiryDate.toISOString().slice(0, 10) },
        { label: 'Payment Terms', value: 'paymentTerms' },
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(subscriptions);

      res.header('Content-Type', 'text/csv');
      res.attachment(`subscriptions_export_${Date.now()}.csv`);
      return res.send(csv);
    } else {
      // Default: export invoices
      const invoices = await prisma.invoice.findMany({
        include: { customer: true, subscription: true },
        take: 5000,
        orderBy: { issuedDate: 'desc' },
      });

      const fields = [
        { label: 'Invoice #', value: 'invoiceNumber' },
        { label: 'Billing Period', value: 'billingPeriod' },
        { label: 'Status', value: 'status' },
        { label: 'Customer Name', value: 'customer.name' },
        { label: 'Customer Email', value: 'customer.email' },
        { label: 'Issue Date', value: (row: any) => row.issuedDate.toISOString().slice(0, 10) },
        { label: 'Due Date', value: (row: any) => row.dueDate.toISOString().slice(0, 10) },
        { label: 'Subtotal ($)', value: 'subtotal' },
        { label: 'Tax Total ($)', value: 'taxTotal' },
        { label: 'Discount ($)', value: 'discountTotal' },
        { label: 'Total Amount ($)', value: 'totalAmount' },
        { label: 'Paid Amount ($)', value: 'paidAmount' },
        { label: 'Outstanding Balance ($)', value: (row: any) => Math.max(0, row.totalAmount - row.paidAmount).toFixed(2) },
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(invoices);

      res.header('Content-Type', 'text/csv');
      res.attachment(`invoices_export_${Date.now()}.csv`);
      return res.send(csv);
    }
  } catch (err: any) {
    console.error('ExportReportCsv error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to export CSV' } });
  }
}

export async function listAuditLogs(req: Request, res: Response) {
  try {
    const { entity, action, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (entity && typeof entity === 'string') where.entity = entity;
    if (action && typeof action === 'string') where.action = action;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err: any) {
    console.error('ListAuditLogs error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch audit logs' } });
  }
}
