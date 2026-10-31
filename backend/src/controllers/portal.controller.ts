import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Money } from '../utils/money';
import { validatePassword, hashPassword, comparePassword } from '../utils/password';
import { createAuditLog } from '../services/audit.service';

/**
 * Helper to get the logged-in customer's ID from user session
 */
async function getCustomerFromUser(userId: string) {
  let customer = await prisma.customer.findUnique({ where: { userId } });
  if (!customer) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      customer = await prisma.customer.findUnique({ where: { email: user.email } });
      if (customer && !customer.userId) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { userId: user.id },
        });
      }
    }
  }
  return customer;
}

export async function getPortalProfile(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, phone: true, role: true },
    });

    const customer = await getCustomerFromUser(userId);

    return res.json({
      success: true,
      data: {
        user,
        customer,
      },
    });
  } catch (err: any) {
    console.error('GetPortalProfile error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve portal profile' } });
  }
}

export async function getPortalSubscriptions(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const customer = await getCustomerFromUser(userId);

    if (!customer) {
      return res.json({ success: true, data: [] });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { customerId: customer.id },
      include: {
        plan: true,
        discount: true,
        lines: {
          include: { product: true, variant: true },
        },
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: subscriptions });
  } catch (err: any) {
    console.error('GetPortalSubscriptions error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch customer subscriptions' } });
  }
}

export async function getPortalInvoices(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const customer = await getCustomerFromUser(userId);

    if (!customer) {
      return res.json({ success: true, data: [] });
    }

    const invoices = await prisma.invoice.findMany({
      where: { customerId: customer.id },
      include: {
        subscription: { select: { subscriptionNumber: true } },
        lines: true,
        payments: true,
      },
      orderBy: { issuedDate: 'desc' },
    });

    const enriched = invoices.map((inv) => ({
      ...inv,
      outstandingAmount: Money.round(Math.max(0, inv.totalAmount - inv.paidAmount)),
      isOverdue: inv.status !== 'PAID' && new Date() > inv.dueDate,
    }));

    return res.json({ success: true, data: enriched });
  } catch (err: any) {
    console.error('GetPortalInvoices error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch customer invoices' } });
  }
}

export async function payPortalInvoice(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { amount, paymentMethod = 'CREDIT_CARD', reference } = req.body;

    const customer = await getCustomerFromUser(userId);
    if (!customer) {
      return res.status(403).json({ success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer record not found.' } });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice || invoice.customerId !== customer.id) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found or access denied.' } });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_PAID', message: 'Invoice is already settled in full.' } });
    }

    const outstanding = Money.subtract(invoice.totalAmount, invoice.paidAmount);
    const payAmount = amount ? Money.round(amount) : outstanding;

    if (payAmount <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Payment amount must be greater than zero.' } });
    }

    if (payAmount > outstanding + 0.001) {
      return res.status(400).json({
        success: false,
        error: { code: 'OVERPAYMENT', message: `Cannot pay more than the outstanding balance of $${outstanding.toFixed(2)}.` },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: payAmount,
          paymentMethod,
          paymentDate: new Date(),
          reference: reference || `CARD-SIM-${Date.now()}`,
          notes: 'Online portal payment',
          createdById: userId,
        },
      });

      const newPaid = Money.add(invoice.paidAmount, payAmount);
      const isSettled = newPaid >= invoice.totalAmount - 0.001;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaid,
          status: isSettled ? 'PAID' : (invoice.status === 'DRAFT' ? 'CONFIRMED' : invoice.status),
        },
      });

      return { payment, updatedInvoice };
    });

    await createAuditLog(req, 'PORTAL_PAYMENT_PROCESSED', 'Invoice', invoice.id, {
      amount: payAmount,
      invoiceNumber: invoice.invoiceNumber,
    });

    return res.json({
      success: true,
      message: 'Payment received successfully. Thank you!',
      data: {
        payment: result.payment,
        invoice: result.updatedInvoice,
        outstandingAmount: Money.round(Math.max(0, result.updatedInvoice.totalAmount - result.updatedInvoice.paidAmount)),
      },
    });
  } catch (err: any) {
    console.error('PayPortalInvoice error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to process portal payment' } });
  }
}

export async function changePortalPassword(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Current password and new password are required.' },
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: { code: 'INCORRECT_CURRENT_PASSWORD', message: 'The current password you provided is incorrect.' },
      });
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: passwordCheck.message },
      });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await createAuditLog(req, 'PORTAL_PASSWORD_CHANGED', 'User', userId);

    return res.json({
      success: true,
      message: 'Your password has been changed successfully.',
    });
  } catch (err: any) {
    console.error('ChangePortalPassword error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update password' } });
  }
}
