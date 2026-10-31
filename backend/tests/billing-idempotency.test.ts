import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../src/config/db';
import { runBillingJob, formatBillingPeriod } from '../src/services/billing.service';

describe('Invoice Engine Idempotency & Automated Invoicing', () => {
  let testCustomer: any;
  let testPlan: any;
  let testProduct: any;
  let subId: string;
  let billingDate: Date;

  beforeAll(async () => {
    testCustomer = await prisma.customer.findFirst();
    testPlan = await prisma.plan.findFirst({ where: { billingPeriod: 'MONTHLY' } });
    testProduct = await prisma.product.findFirst();

    // Create an active subscription with nextBillingDate set to 5 days ago
    billingDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const subNumber = `SUB-TEST-IDEMP-${Date.now()}`;

    const sub = await prisma.subscription.create({
      data: {
        subscriptionNumber: subNumber,
        customerId: testCustomer.id,
        planId: testPlan.id,
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 330 * 24 * 60 * 60 * 1000),
        paymentTerms: 'NET30',
        nextBillingDate: billingDate,
        lines: {
          create: [
            {
              productId: testProduct.id,
              quantity: 2,
              unitPrice: testProduct.salesPrice,
              taxRate: 15.0,
              amount: testProduct.salesPrice * 2,
            },
          ],
        },
      },
    });

    subId = sub.id;
  });

  it('should generate an invoice on the first billing job execution', async () => {
    const expectedPeriod = formatBillingPeriod(billingDate, testPlan.billingPeriod);

    // Run billing job targeting this specific subscription
    const run1 = await runBillingJob(new Date(), subId);

    expect(run1.errors.length).toBe(0);
    expect(run1.invoicesGenerated).toBe(1);

    // Verify invoice created
    const createdInvoice = await prisma.invoice.findUnique({
      where: {
        subscriptionId_billingPeriod: {
          subscriptionId: subId,
          billingPeriod: expectedPeriod,
        },
      },
      include: { lines: true },
    });

    expect(createdInvoice).not.toBeNull();
    expect(createdInvoice?.status).toBe('DRAFT');
    expect(createdInvoice?.subscriptionId).toBe(subId);
    expect(createdInvoice?.lines.length).toBe(1);
    expect(createdInvoice?.lines[0].taxRate).toBe(15.0);
  });

  it('should safely skip without generating duplicate invoices when re-run for same billing cycle', async () => {
    const expectedPeriod = formatBillingPeriod(billingDate, testPlan.billingPeriod);

    // Simulate re-running job with same nextBillingDate (e.g. re-trigger or batch re-try)
    await prisma.subscription.update({
      where: { id: subId },
      data: { nextBillingDate: billingDate },
    });

    // Run billing job a SECOND time
    const run2 = await runBillingJob(new Date(), subId);

    expect(run2.errors.length).toBe(0);
    expect(run2.invoicesGenerated).toBe(0);
    expect(run2.skippedAlreadyBilled).toBe(1);

    // Query database for all invoices matching this subscription and period
    const matchingInvoices = await prisma.invoice.findMany({
      where: {
        subscriptionId: subId,
        billingPeriod: expectedPeriod,
      },
    });

    // CRITICAL: Exactly 1 invoice must exist, never 2
    expect(matchingInvoices.length).toBe(1);
  });

  it('should remain idempotent even on a third execution', async () => {
    const expectedPeriod = formatBillingPeriod(billingDate, testPlan.billingPeriod);

    // Reset date again to simulate repeated scheduled trigger
    await prisma.subscription.update({
      where: { id: subId },
      data: { nextBillingDate: billingDate },
    });

    // Third run
    const run3 = await runBillingJob(new Date(), subId);

    expect(run3.invoicesGenerated).toBe(0);
    expect(run3.skippedAlreadyBilled).toBe(1);

    const finalCount = await prisma.invoice.count({
      where: {
        subscriptionId: subId,
        billingPeriod: expectedPeriod,
      },
    });

    expect(finalCount).toBe(1);
  });
});
