import { prisma } from '../config/db';
import { Money } from '../utils/money';

export interface BillingResult {
  totalEligible: number;
  invoicesGenerated: number;
  skippedAlreadyBilled: number;
  errors: Array<{ subscriptionId: string; error: string }>;
  generatedInvoiceIds: string[];
}

/**
 * Format a billing period key for idempotency:
 * DAILY: YYYY-MM-DD
 * WEEKLY: YYYY-Www
 * MONTHLY: YYYY-MM
 * YEARLY: YYYY
 */
export function formatBillingPeriod(date: Date, period: string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  switch (period.toUpperCase()) {
    case 'DAILY':
      return `${year}-${month}-${day}`;
    case 'WEEKLY': {
      // Calculate ISO week
      const tempDate = new Date(d.getTime());
      tempDate.setHours(0, 0, 0, 0);
      tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
      const week1 = new Date(tempDate.getFullYear(), 0, 4);
      const weekNumber = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    }
    case 'YEARLY':
      return `${year}`;
    case 'MONTHLY':
    default:
      return `${year}-${month}`;
  }
}

/**
 * Compute the next billing date given current billing date and period
 */
export function advanceBillingDate(currentDate: Date, period: string): Date {
  const next = new Date(currentDate);
  switch (period.toUpperCase()) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'MONTHLY':
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

/**
 * Compute due date based on payment terms
 */
export function computeDueDate(issuedDate: Date, paymentTerms: string): Date {
  const due = new Date(issuedDate);
  switch (paymentTerms.toUpperCase()) {
    case 'IMMEDIATE':
      break;
    case 'NET15':
      due.setDate(due.getDate() + 15);
      break;
    case 'NET60':
      due.setDate(due.getDate() + 60);
      break;
    case 'NET30':
    default:
      due.setDate(due.getDate() + 30);
      break;
  }
  return due;
}

/**
 * Generate human readable sequential invoice number: INV-YYYY-XXXXX
 */
async function generateInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
}

/**
 * Run automated invoicing for all ACTIVE subscriptions that are due for billing.
 * Safe and strictly idempotent:
 * - Uses unique constraint @@unique([subscriptionId, billingPeriod])
 * - Isolated transaction per subscription invoice
 * - Safely re-runnable at any frequency
 */
export async function runBillingJob(targetDate: Date = new Date(), filterSubscriptionId?: string): Promise<BillingResult> {
  const result: BillingResult = {
    totalEligible: 0,
    invoicesGenerated: 0,
    skippedAlreadyBilled: 0,
    errors: [],
    generatedInvoiceIds: [],
  };

  // Find eligible ACTIVE subscriptions where nextBillingDate <= targetDate
  const whereClause: any = {
    status: 'ACTIVE',
    nextBillingDate: { lte: targetDate },
  };

  if (filterSubscriptionId) {
    whereClause.id = filterSubscriptionId;
  }

  const eligibleSubscriptions = await prisma.subscription.findMany({
    where: whereClause,
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
    },
    orderBy: { nextBillingDate: 'asc' },
  });

  result.totalEligible = eligibleSubscriptions.length;

  // Cache active tax rules for fast calculations
  const taxRules = await prisma.taxRule.findMany({
    where: { active: true },
  });

  for (const subscription of eligibleSubscriptions) {
    const billingPeriod = formatBillingPeriod(subscription.nextBillingDate, subscription.plan.billingPeriod);

    try {
      // Check if an invoice for this subscription & billing period already exists (idempotency check)
      const existingInvoice = await prisma.invoice.findUnique({
        where: {
          subscriptionId_billingPeriod: {
            subscriptionId: subscription.id,
            billingPeriod,
          },
        },
      });

      if (existingInvoice) {
        result.skippedAlreadyBilled++;
        continue;
      }

      // Execute invoice creation in an isolated database transaction
      const invoice = await prisma.$transaction(async (tx) => {
        // Re-check inside transaction to prevent race conditions
        const checkInside = await tx.invoice.findUnique({
          where: {
            subscriptionId_billingPeriod: {
              subscriptionId: subscription.id,
              billingPeriod,
            },
          },
        });
        if (checkInside) {
          result.skippedAlreadyBilled++;
          return null;
        }

        const invoiceNumber = await generateInvoiceNumber();
        const issuedDate = new Date();
        const dueDate = computeDueDate(issuedDate, subscription.paymentTerms);

        let subtotal = 0;
        let taxTotal = 0;
        const invoiceLinesData: any[] = [];

        // Calculate line items and taxes
        for (const line of subscription.lines) {
          const qty = line.quantity;
          const unitPrice = line.unitPrice;
          const lineGross = Money.multiply(qty, unitPrice);
          subtotal = Money.add(subtotal, lineGross);

          // Find matching tax rule
          let lineTaxRate = line.taxRate;
          let taxSnapshot: any = { ratePercent: lineTaxRate, appliedRule: 'SUBSCRIPTION_LINE_RATE' };

          if (lineTaxRate === 0 && line.product) {
            const matchedRule = taxRules.find(
              (r) => r.appliesToType === 'ALL' || r.appliesToType === line.product.type
            );
            if (matchedRule) {
              lineTaxRate = matchedRule.ratePercent;
              taxSnapshot = {
                ruleId: matchedRule.id,
                ruleName: matchedRule.name,
                ratePercent: matchedRule.ratePercent,
                appliesToType: matchedRule.appliesToType,
              };
            }
          }

          const lineTaxAmount = Money.calcPercentage(lineGross, lineTaxRate);
          taxTotal = Money.add(taxTotal, lineTaxAmount);

          const desc = `${line.product?.name || 'Item'}${line.variant ? ` (${line.variant.name})` : ''} - Plan: ${subscription.plan.name}`;

          invoiceLinesData.push({
            productId: line.productId,
            variantId: line.variantId,
            description: desc,
            quantity: qty,
            unitPrice,
            taxRate: lineTaxRate,
            taxAmount: lineTaxAmount,
            discountAmount: 0,
            lineTotal: Money.add(lineGross, lineTaxAmount),
            taxSnapshotJson: JSON.stringify(taxSnapshot),
          });
        }

        // Apply discount if active and applicable
        let discountTotal = 0;
        let appliedDiscountId: string | null = null;

        if (subscription.discount && subscription.discount.active) {
          const disc = subscription.discount;
          const isStarted = disc.startDate <= issuedDate;
          const isNotExpired = disc.endDate >= issuedDate;
          const hasUsageLeft = disc.maxUsageCount === 0 || disc.usageCount < disc.maxUsageCount;
          const meetsMinPurchase = disc.minPurchase === 0 || subtotal >= disc.minPurchase;

          if (isStarted && isNotExpired && hasUsageLeft && meetsMinPurchase) {
            appliedDiscountId = disc.id;
            if (disc.type === 'PERCENTAGE') {
              discountTotal = Money.calcPercentage(subtotal, disc.value);
            } else {
              discountTotal = Math.min(disc.value, subtotal);
            }

            // Atomically increment discount usage count
            await tx.discount.update({
              where: { id: disc.id },
              data: {
                usageCount: { increment: 1 },
                // If this usage hits maxUsageCount, auto-deactivate
                ...(disc.maxUsageCount > 0 && disc.usageCount + 1 >= disc.maxUsageCount && {
                  active: false,
                }),
              },
            });
          }
        }

        const totalAmount = Money.round(Math.max(0, Money.subtract(Money.add(subtotal, taxTotal), discountTotal)));

        // Create the invoice with its lines
        const newInvoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            subscriptionId: subscription.id,
            customerId: subscription.customerId,
            billingPeriod,
            status: 'DRAFT',
            issuedDate,
            dueDate,
            subtotal,
            taxTotal,
            discountTotal,
            totalAmount,
            paidAmount: 0,
            discountId: appliedDiscountId,
            notes: `Automated recurring billing for period ${billingPeriod}`,
            lines: {
              create: invoiceLinesData,
            },
          },
        });

        // Advance subscription nextBillingDate
        const newNextBilling = advanceBillingDate(subscription.nextBillingDate, subscription.plan.billingPeriod);

        // Check if subscription has expired and should auto-close
        const shouldClose = subscription.plan.autoCloseAtEndDate && newNextBilling >= subscription.expiryDate;

        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            nextBillingDate: newNextBilling,
            ...(shouldClose && { status: 'CLOSED' }),
          },
        });

        if (shouldClose) {
          await tx.subscriptionStatusHistory.create({
            data: {
              subscriptionId: subscription.id,
              fromStatus: 'ACTIVE',
              toStatus: 'CLOSED',
              reason: 'Plan auto-closed upon reaching expiry date after billing cycle',
            },
          });
        }

        return newInvoice;
      });

      if (invoice) {
        result.invoicesGenerated++;
        result.generatedInvoiceIds.push(invoice.id);
      }
    } catch (err: any) {
      console.error(`Billing error for subscription ${subscription.id}:`, err);
      result.errors.push({
        subscriptionId: subscription.id,
        error: err.message || 'Unknown billing error',
      });
    }
  }

  return result;
}
