import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Money } from '../utils/money';
import { createAuditLog } from '../services/audit.service';
import { runBillingJob } from '../services/billing.service';

export async function listInvoices(req: Request, res: Response) {
  try {
    const { status, customerId, subscriptionId, search, page = '1', limit = '25' } = req.query;

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
    if (subscriptionId && typeof subscriptionId === 'string') {
      where.subscriptionId = subscriptionId;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { email: { contains: search } } },
      ];
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take,
        include: {
          customer: true,
          subscription: {
            select: { subscriptionNumber: true, status: true },
          },
          _count: { select: { lines: true, payments: true } },
        },
        orderBy: { issuedDate: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: invoices,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err: any) {
    console.error('ListInvoices error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch invoices' } });
  }
}

export async function getInvoiceById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: {
          include: { plan: true },
        },
        discount: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
        payments: {
          include: {
            createdBy: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found.' },
      });
    }

    // Customer RBAC check
    if (req.user?.role === 'CUSTOMER') {
      if (invoice.customerId !== req.user.customerId && invoice.customer.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied.' },
        });
      }
    }

    const outstandingAmount = Money.round(Math.max(0, invoice.totalAmount - invoice.paidAmount));
    const isOverdue = invoice.status !== 'PAID' && new Date() > invoice.dueDate;

    return res.json({
      success: true,
      data: {
        ...invoice,
        outstandingAmount,
        isOverdue,
      },
    });
  } catch (err: any) {
    console.error('GetInvoiceById error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch invoice details' } });
  }
}

export async function confirmInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found.' } });
    }

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Only DRAFT invoices can be confirmed. Current status: ${invoice.status}` },
      });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    await createAuditLog(req, 'INVOICE_CONFIRMED', 'Invoice', id, { invoiceNumber: invoice.invoiceNumber });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('ConfirmInvoice error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to confirm invoice' } });
  }
}

export async function cancelInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found.' } });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_CANCEL_PAID', message: 'Paid invoices cannot be cancelled directly.' },
      });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await createAuditLog(req, 'INVOICE_CANCELLED', 'Invoice', id, { invoiceNumber: invoice.invoiceNumber });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('CancelInvoice error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to cancel invoice' } });
  }
}

export async function sendInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found.' } });
    }

    const now = new Date();
    const updated = await prisma.invoice.update({
      where: { id },
      data: { sentAt: now },
    });

    console.log(`\n======================================================`);
    console.log(`[MOCK MAILER] Invoice ${invoice.invoiceNumber} dispatched`);
    console.log(`[MOCK MAILER] Recipient: ${invoice.customer.email}`);
    console.log(`[MOCK MAILER] Amount Due: $${invoice.totalAmount.toFixed(2)} | Due Date: ${invoice.dueDate.toISOString().slice(0, 10)}`);
    console.log(`======================================================\n`);

    await createAuditLog(req, 'INVOICE_SENT_EMAIL', 'Invoice', id, {
      invoiceNumber: invoice.invoiceNumber,
      customerEmail: invoice.customer.email,
    });

    return res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} emailed successfully to ${invoice.customer.email}.`,
      data: updated,
    });
  } catch (err: any) {
    console.error('SendInvoice error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to send invoice' } });
  }
}

export async function generateDueInvoices(req: Request, res: Response) {
  try {
    const { targetDate } = req.body;
    const date = targetDate ? new Date(targetDate) : new Date();

    const summary = await runBillingJob(date);

    await createAuditLog(req, 'BILLING_JOB_TRIGGERED', 'Invoice', null, {
      targetDate: date.toISOString(),
      generated: summary.invoicesGenerated,
      skipped: summary.skippedAlreadyBilled,
    });

    return res.json({
      success: true,
      data: summary,
      message: `Billing cycle executed: ${summary.invoicesGenerated} invoices generated, ${summary.skippedAlreadyBilled} idempotent skips.`,
    });
  } catch (err: any) {
    console.error('GenerateDueInvoices error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to execute billing run' } });
  }
}

export async function renderInvoiceHtml(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: { include: { product: true, variant: true } },
        payments: true,
        discount: true,
      },
    });

    if (!invoice) {
      return res.status(404).send('<h1>Invoice Not Found</h1>');
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceNumber} - Brightloop</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 24px; }
    .logo { font-size: 28px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.5px; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { margin: 0; font-size: 24px; color: #0f172a; }
    .meta-box { margin-top: 24px; display: flex; justify-content: space-between; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
    .table th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 13px; text-transform: uppercase; color: #64748b; }
    .table td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .totals { margin-top: 24px; margin-left: auto; width: 320px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .grand-total { font-size: 18px; font-weight: 700; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 6px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-confirmed { background: #dbeafe; color: #1d4ed8; }
    .badge-draft { background: #f1f5f9; color: #475569; }
    .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Print / Save as PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="logo">⚡ Brightloop</div>
      <div style="color: #64748b; font-size: 13px; margin-top: 4px;">Subscription Management Platform</div>
      <div style="font-size: 13px; margin-top: 8px;">100 Silicon Way, Tech District</div>
      <div style="font-size: 13px;">billing@brightloop.io</div>
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <div style="font-weight: 700; font-size: 16px; color: #3b82f6; margin-top: 4px;">${invoice.invoiceNumber}</div>
      <div style="margin-top: 8px;">
        <span class="badge badge-${invoice.status.toLowerCase()}">${invoice.status}</span>
      </div>
    </div>
  </div>

  <div class="meta-box">
    <div>
      <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Billed To:</div>
      <div style="font-weight: 700; font-size: 15px; margin-top: 4px;">${invoice.customer.name}</div>
      ${invoice.customer.company ? `<div>${invoice.customer.company}</div>` : ''}
      <div>${invoice.customer.email}</div>
      ${invoice.customer.address ? `<div>${invoice.customer.address}</div>` : ''}
    </div>
    <div style="text-align: right;">
      <div style="font-size: 13px;"><strong>Issue Date:</strong> ${invoice.issuedDate.toISOString().slice(0, 10)}</div>
      <div style="font-size: 13px; margin-top: 4px;"><strong>Due Date:</strong> ${invoice.dueDate.toISOString().slice(0, 10)}</div>
      <div style="font-size: 13px; margin-top: 4px;"><strong>Period:</strong> ${invoice.billingPeriod}</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Tax</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lines.map(line => `
        <tr>
          <td>${line.description}</td>
          <td style="text-align: center;">${line.quantity}</td>
          <td style="text-align: right;">$${line.unitPrice.toFixed(2)}</td>
          <td style="text-align: right;">$${line.taxAmount.toFixed(2)} (${line.taxRate}%)</td>
          <td style="text-align: right;">$${line.lineTotal.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>$${invoice.subtotal.toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span>Tax Total:</span>
      <span>$${invoice.taxTotal.toFixed(2)}</span>
    </div>
    ${invoice.discountTotal > 0 ? `
    <div class="totals-row" style="color: #16a34a;">
      <span>Discount:</span>
      <span>-$${invoice.discountTotal.toFixed(2)}</span>
    </div>` : ''}
    <div class="totals-row grand-total">
      <span>Total Amount:</span>
      <span>$${invoice.totalAmount.toFixed(2)}</span>
    </div>
    <div class="totals-row" style="color: #2563eb; font-weight: 600;">
      <span>Paid:</span>
      <span>$${invoice.paidAmount.toFixed(2)}</span>
    </div>
    <div class="totals-row" style="font-weight: 700; color: ${invoice.totalAmount - invoice.paidAmount > 0 ? '#dc2626' : '#16a34a'};">
      <span>Outstanding Balance:</span>
      <span>$${Math.max(0, invoice.totalAmount - invoice.paidAmount).toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for choosing Brightloop. For billing queries, please contact support@brightloop.io.</p>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err: any) {
    console.error('RenderInvoiceHtml error:', err);
    return res.status(500).send('<h1>Error generating invoice view</h1>');
  }
}
