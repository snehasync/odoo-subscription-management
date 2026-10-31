import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Money } from '../utils/money';
import { createAuditLog } from '../services/audit.service';

export async function recordPayment(req: Request, res: Response) {
  try {
    const { invoiceId, amount, paymentMethod = 'CREDIT_CARD', paymentDate, reference, notes } = req.body;

    if (!invoiceId || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invoice ID and a positive payment amount are required.' },
      });
    }

    const payAmount = Money.round(amount);

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true },
      });

      if (!invoice) {
        throw new Error('INVOICE_NOT_FOUND');
      }

      if (invoice.status === 'CANCELLED') {
        throw new Error('INVOICE_CANCELLED');
      }

      const currentPaid = invoice.paidAmount;
      const total = invoice.totalAmount;
      const remainingDue = Money.subtract(total, currentPaid);

      if (remainingDue <= 0 && invoice.status === 'PAID') {
        throw new Error('ALREADY_PAID');
      }

      // Check if payment amount exceeds remaining due
      if (payAmount > remainingDue + 0.001) {
        throw new Error(`OVERPAYMENT_EXCEEDED:${remainingDue.toFixed(2)}`);
      }

      const pDate = paymentDate ? new Date(paymentDate) : new Date();

      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: payAmount,
          paymentMethod,
          paymentDate: pDate,
          reference: reference || null,
          notes: notes || null,
          createdById: req.user?.userId || null,
        },
      });

      // Update invoice paid amount and check for completion
      const newPaidAmount = Money.add(currentPaid, payAmount);
      const isSettled = newPaidAmount >= total - 0.001;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: isSettled ? 'PAID' : (invoice.status === 'DRAFT' ? 'CONFIRMED' : invoice.status),
        },
      });

      return { payment, updatedInvoice };
    });

    await createAuditLog(req, 'PAYMENT_RECORDED', 'Payment', result.payment.id, {
      invoiceId,
      amount: payAmount,
      method: paymentMethod,
      newInvoiceStatus: result.updatedInvoice.status,
    });

    return res.status(201).json({
      success: true,
      data: {
        payment: result.payment,
        invoice: result.updatedInvoice,
        outstandingAmount: Money.round(Math.max(0, result.updatedInvoice.totalAmount - result.updatedInvoice.paidAmount)),
      },
    });
  } catch (err: any) {
    console.error('RecordPayment error:', err);
    if (err.message === 'INVOICE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found.' } });
    }
    if (err.message === 'INVOICE_CANCELLED') {
      return res.status(400).json({ success: false, error: { code: 'INVOICE_CANCELLED', message: 'Cannot record payment for a cancelled invoice.' } });
    }
    if (err.message === 'ALREADY_PAID') {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_PAID', message: 'This invoice is already fully paid.' } });
    }
    if (err.message && err.message.startsWith('OVERPAYMENT_EXCEEDED')) {
      const remaining = err.message.split(':')[1];
      return res.status(400).json({
        success: false,
        error: { code: 'OVERPAYMENT', message: `Payment exceeds outstanding balance of $${remaining}.` },
      });
    }
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to record payment' } });
  }
}

export async function listPayments(req: Request, res: Response) {
  try {
    const { invoiceId, customerId, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (invoiceId && typeof invoiceId === 'string') {
      where.invoiceId = invoiceId;
    }
    if (customerId && typeof customerId === 'string') {
      where.invoice = { customerId };
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take,
        include: {
          invoice: {
            include: { customer: true },
          },
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: payments,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err: any) {
    console.error('ListPayments error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch payments' } });
  }
}
