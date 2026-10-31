import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Brightloop Database Seeding...');

  // Clean existing data in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionStatusHistory.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.quotationTemplateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.product.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.taxRule.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // Pre-compute password hashes
  const adminHash = await bcrypt.hash('Admin@12345!', 10);
  const staffHash = await bcrypt.hash('Staff@12345!', 10);
  const customerHash = await bcrypt.hash('Customer@12345!', 10);

  // 1. Create Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@brightloop.io',
      passwordHash: adminHash,
      fullName: 'Chief Administrator',
      role: 'ADMIN',
      phone: '+1-555-0100',
    },
  });

  // 2. Create 2 Staff Accounts
  const staff1 = await prisma.user.create({
    data: {
      email: 'staff1@brightloop.io',
      passwordHash: staffHash,
      fullName: 'Alex Vance (Sales Ops)',
      role: 'STAFF',
      phone: '+1-555-0101',
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      email: 'staff2@brightloop.io',
      passwordHash: staffHash,
      fullName: 'Jordan Lee (Billing Specialist)',
      role: 'STAFF',
      phone: '+1-555-0102',
    },
  });

  console.log('👤 Admin and Staff accounts created.');

  // 3. Create 20 Customers + User Accounts for each
  const customerCompanies = [
    { name: 'Acme Global Corp', company: 'Acme Corp', email: 'billing@acme.com', address: '123 Market St, San Francisco, CA' },
    { name: 'Nexus Dynamics', company: 'Nexus Inc', email: 'finance@nexusdynamics.io', address: '456 Tech Park, Austin, TX' },
    { name: 'Apex Solutions', company: 'Apex Group', email: 'accounts@apexsolutions.com', address: '789 Enterprise Blvd, New York, NY' },
    { name: 'Quantum Cloud Ltd', company: 'Quantum Ltd', email: 'ops@quantumcloud.co', address: '101 Innovation Way, Seattle, WA' },
    { name: 'Horizon Media Partners', company: 'Horizon Media', email: 'contact@horizonmedia.com', address: '222 Sunset Blvd, Los Angeles, CA' },
    { name: 'Starlight Retailers', company: 'Starlight Group', email: 'invoices@starlightretail.com', address: '333 Pine St, Chicago, IL' },
    { name: 'Pinnacle Health Tech', company: 'Pinnacle Health', email: 'finance@pinnaclehealth.org', address: '444 Health Plaza, Boston, MA' },
    { name: 'Echo Stream Studios', company: 'EchoStream LLC', email: 'billing@echostream.com', address: '555 Audio Dr, Nashville, TN' },
    { name: 'Nova Logistics', company: 'Nova Freight Corp', email: 'accounts@novalogistics.com', address: '666 Cargo Hub, Atlanta, GA' },
    { name: 'Cobalt Cyber Labs', company: 'Cobalt Labs', email: 'security@cobaltlabs.io', address: '777 Cyber Safe, Denver, CO' },
    { name: 'Vanguard Analytics', company: 'Vanguard Data', email: 'info@vanguardanalytics.com', address: '888 Data Center, San Jose, CA' },
    { name: 'BluePeak Capital', company: 'BluePeak LLC', email: 'investments@bluepeakcap.com', address: '999 Wall St, New York, NY' },
    { name: 'Summit Robotics', company: 'Summit Automation', email: 'robotics@summitauto.io', address: '110 Bot Way, Pittsburgh, PA' },
    { name: 'AeroSpace Next', company: 'AeroSpace Inc', email: 'launch@aerospacenext.com', address: '120 Cape Canaveral, Orlando, FL' },
    { name: 'BioGenix Diagnostics', company: 'BioGenix Corp', email: 'lab@biogenix.org', address: '130 Bio Lab Ave, San Diego, CA' },
    { name: 'Terra Green Energy', company: 'Terra Energy', email: 'solar@terragreen.com', address: '140 Solar Way, Phoenix, AZ' },
    { name: 'Silverline Travel', company: 'Silverline Tours', email: 'book@silverlinetravel.com', address: '150 Ocean Dr, Miami, FL' },
    { name: 'Velocity Motors', company: 'Velocity EV', email: 'ev@velocitymotors.com', address: '160 Electric Ave, Detroit, MI' },
    { name: 'OmniSphere Retail', company: 'OmniSphere Co', email: 'store@omnisphere.com', address: '170 Mall Way, Dallas, TX' },
    { name: 'Zephyr Communications', company: 'Zephyr Telecom', email: 'customer@zephyrtelecom.com', address: '180 Fiber Optic Blvd, Charlotte, NC' },
  ];

  const createdCustomers: any[] = [];

  for (let i = 0; i < customerCompanies.length; i++) {
    const c = customerCompanies[i];
    // Create customer portal user
    const cUser = await prisma.user.create({
      data: {
        email: c.email,
        passwordHash: customerHash,
        fullName: c.name,
        role: 'CUSTOMER',
        phone: `+1-555-02${String(i).padStart(2, '0')}`,
      },
    });

    const cust = await prisma.customer.create({
      data: {
        userId: cUser.id,
        name: c.name,
        email: c.email,
        company: c.company,
        address: c.address,
        phone: `+1-555-02${String(i).padStart(2, '0')}`,
        notes: `Enterprise customer since ${2023 + (i % 3)}`,
      },
    });

    createdCustomers.push(cust);
  }

  console.log(`🏢 Created ${createdCustomers.length} Customers and linked Customer Portal Users.`);

  // 4. Create Taxes
  const vatTax = await prisma.taxRule.create({
    data: { name: 'Standard VAT', ratePercent: 15.0, appliesToType: 'ALL', active: true },
  });
  const salesTax = await prisma.taxRule.create({
    data: { name: 'State Sales Tax', ratePercent: 8.25, appliesToType: 'PHYSICAL', active: true },
  });
  const digitalTax = await prisma.taxRule.create({
    data: { name: 'Digital Services Tax', ratePercent: 5.0, appliesToType: 'DIGITAL', active: true },
  });
  const exemptTax = await prisma.taxRule.create({
    data: { name: 'Tax Exempt', ratePercent: 0.0, appliesToType: 'ALL', active: true },
  });

  console.log('🏛️ Tax rules created.');

  // 5. Create Products and Variants
  const p1 = await prisma.product.create({
    data: {
      name: 'Cloud Dedicated Cluster',
      type: 'SERVICE',
      salesPrice: 299.0,
      costPrice: 80.0,
      notes: 'High-availability Kubernetes worker nodes',
      variants: {
        create: [
          { name: 'Region: US-East', priceAdjustment: 0 },
          { name: 'Region: EU-Central', priceAdjustment: 30 },
          { name: 'Region: AP-South', priceAdjustment: 45 },
        ],
      },
    },
    include: { variants: true },
  });

  const p2 = await prisma.product.create({
    data: {
      name: 'Enterprise ERP Suite',
      type: 'DIGITAL',
      salesPrice: 799.0,
      costPrice: 150.0,
      notes: 'Full ERP modules including manufacturing and supply chain',
      variants: {
        create: [
          { name: 'Standard Core', priceAdjustment: 0 },
          { name: 'Odoo Enterprise Connector', priceAdjustment: 560.0 },
          { name: 'SAP NetWeaver Bridge', priceAdjustment: 950.0 },
        ],
      },
    },
    include: { variants: true },
  });

  const p3 = await prisma.product.create({
    data: {
      name: '24/7 Mission Critical Support SLA',
      type: 'SERVICE',
      salesPrice: 450.0,
      costPrice: 100.0,
      notes: '15-minute response SLA with dedicated technical account manager',
    },
  });

  const p4 = await prisma.product.create({
    data: {
      name: 'Hardware Security Key (FIPS 140-2)',
      type: 'PHYSICAL',
      salesPrice: 85.0,
      costPrice: 35.0,
      notes: 'Physical token for tamper-proof multi-factor authentication',
    },
  });

  console.log('📦 Products and variants created.');

  // 6. Create Plans
  const now = new Date();
  const planStarter = await prisma.plan.create({
    data: {
      name: 'Starter Monthly',
      code: 'START-M',
      price: 99.0,
      billingPeriod: 'MONTHLY',
      minQuantity: 1,
      availableFrom: new Date(2025, 0, 1),
      availableTo: new Date(2035, 11, 31),
      allowEarlyClose: true,
      allowPause: true,
      allowRenewal: true,
      active: true,
    },
  });

  const planPro = await prisma.plan.create({
    data: {
      name: 'Professional Monthly',
      code: 'PRO-M',
      price: 249.0,
      billingPeriod: 'MONTHLY',
      minQuantity: 1,
      availableFrom: new Date(2025, 0, 1),
      availableTo: new Date(2035, 11, 31),
      allowEarlyClose: true,
      allowPause: true,
      allowRenewal: true,
      active: true,
    },
  });

  const planEnterprise = await prisma.plan.create({
    data: {
      name: 'Enterprise Annual',
      code: 'ENT-Y',
      price: 2490.0,
      billingPeriod: 'YEARLY',
      minQuantity: 1,
      availableFrom: new Date(2025, 0, 1),
      availableTo: new Date(2035, 11, 31),
      allowEarlyClose: false,
      allowPause: true,
      allowRenewal: true,
      active: true,
    },
  });

  const planWeekly = await prisma.plan.create({
    data: {
      name: 'Weekly Sprint Pass',
      code: 'SPRINT-W',
      price: 65.0,
      billingPeriod: 'WEEKLY',
      minQuantity: 1,
      availableFrom: new Date(2025, 0, 1),
      availableTo: new Date(2035, 11, 31),
      allowEarlyClose: true,
      allowPause: false,
      allowRenewal: true,
      active: true,
    },
  });

  const planDaily = await prisma.plan.create({
    data: {
      name: 'Daily Trial Flight',
      code: 'TRIAL-D',
      price: 15.0,
      billingPeriod: 'DAILY',
      minQuantity: 1,
      availableFrom: new Date(2025, 0, 1),
      availableTo: new Date(2035, 11, 31),
      autoCloseAtEndDate: true,
      allowEarlyClose: true,
      allowPause: false,
      allowRenewal: false,
      active: true,
    },
  });

  const allPlans = [planStarter, planPro, planEnterprise, planWeekly, planDaily];
  console.log(`📋 Created ${allPlans.length} subscription plans.`);

  // 7. Create Discounts
  const d1 = await prisma.discount.create({
    data: {
      code: 'WELCOME20',
      type: 'PERCENTAGE',
      value: 20.0,
      minPurchase: 100.0,
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2030, 11, 31),
      maxUsageCount: 500,
      usageCount: 12,
      active: true,
    },
  });

  const d2 = await prisma.discount.create({
    data: {
      code: 'FLAT50',
      type: 'FIXED',
      value: 50.0,
      minPurchase: 200.0,
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2030, 11, 31),
      maxUsageCount: 1000,
      usageCount: 45,
      active: true,
    },
  });

  console.log('🏷️ Discounts created.');

  // 8. Create Quotation Templates
  await prisma.quotationTemplate.create({
    data: {
      name: 'Enterprise Cloud + ERP Kickstart',
      validityDays: 45,
      notes: 'Standard bundle for large-scale migrations',
      lines: {
        create: [
          { productId: p1.id, variantId: p1.variants[0]?.id, quantity: 2, unitPrice: 299.0 },
          { productId: p2.id, variantId: p2.variants[1]?.id, quantity: 1, unitPrice: 1359.0 }, // 799 + 560
          { productId: p3.id, quantity: 1, unitPrice: 450.0 },
        ],
      },
    },
  });

  console.log('📑 Quotation template created.');

  // 9. Seed 2,100 Subscriptions for High-Volume Demonstration
  console.log('⚡ Generating 2,100 subscriptions (this will be fast with batching)...');

  const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'CONFIRMED', 'QUOTATION', 'DRAFT', 'CLOSED'];
  const terms = ['NET30', 'NET15', 'NET30', 'IMMEDIATE', 'NET60'];

  const subscriptionsToInsert: any[] = [];
  const statusHistoriesToInsert: any[] = [];
  const linesToInsert: any[] = [];

  const baseYear = 2026;

  for (let i = 1; i <= 2100; i++) {
    const subId = `seed-sub-${i}`;
    const subNumber = `SUB-${baseYear}-${String(i).padStart(5, '0')}`;
    const customer = createdCustomers[i % createdCustomers.length];
    const plan = allPlans[i % allPlans.length];
    const status = statuses[i % statuses.length];
    const paymentTerm = terms[i % terms.length];

    // Distribute start dates over the past 12 months
    const daysAgo = (i % 360) + 1;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Next billing date: for some, make it in the past so billing job can generate invoices
    const nextBillingDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    subscriptionsToInsert.push({
      id: subId,
      subscriptionNumber: subNumber,
      customerId: customer.id,
      planId: plan.id,
      status,
      startDate,
      expiryDate,
      paymentTerms: paymentTerm,
      nextBillingDate,
      discountId: i % 10 === 0 ? d1.id : null,
      notes: `Batch subscription demo #${i}`,
      createdAt: startDate,
      updatedAt: new Date(),
    });

    statusHistoriesToInsert.push({
      id: `seed-sh-${i}`,
      subscriptionId: subId,
      fromStatus: 'DRAFT',
      toStatus: status,
      changedById: adminUser.id,
      reason: 'Batch seeded test subscription',
      createdAt: startDate,
    });

    // Each subscription gets 1 or 2 lines
    const product = i % 2 === 0 ? p1 : p2;
    const variantId = product.variants && product.variants.length > 0 ? product.variants[i % product.variants.length].id : null;
    const priceAdjustment = variantId && product.variants ? (product.variants.find((v) => v.id === variantId)?.priceAdjustment || 0) : 0;
    const unitPrice = product.salesPrice + priceAdjustment;
    const quantity = (i % 3) + 1;

    linesToInsert.push({
      id: `seed-line-${i}`,
      subscriptionId: subId,
      productId: product.id,
      variantId,
      quantity,
      unitPrice,
      taxRate: 15.0,
      amount: unitPrice * quantity,
    });
  }

  // Insert in chunks of 500 to stay well within SQLite parameter boundaries
  const CHUNK_SIZE = 500;
  for (let c = 0; c < subscriptionsToInsert.length; c += CHUNK_SIZE) {
    const subChunk = subscriptionsToInsert.slice(c, c + CHUNK_SIZE);
    const histChunk = statusHistoriesToInsert.slice(c, c + CHUNK_SIZE);
    const lineChunk = linesToInsert.slice(c, c + CHUNK_SIZE);

    await prisma.subscription.createMany({ data: subChunk });
    await prisma.subscriptionStatusHistory.createMany({ data: histChunk });
    await prisma.subscriptionLine.createMany({ data: lineChunk });
  }

  console.log(`✅ 2,100 Subscriptions, lines, and history records successfully inserted!`);

  // 10. Generate Invoices and Payments for realistic dashboard demonstration
  console.log('💳 Generating seed invoices and payment records...');

  const invoicesToInsert: any[] = [];
  const invoiceLinesToInsert: any[] = [];
  const paymentsToInsert: any[] = [];

  const invoiceStatuses = ['PAID', 'PAID', 'PAID', 'CONFIRMED', 'DRAFT'];
  const payMethods = ['CREDIT_CARD', 'STRIPE', 'BANK_TRANSFER', 'CHECK'];

  // Create 350 invoices linked to subscriptions
  for (let invIdx = 1; invIdx <= 350; invIdx++) {
    const invId = `seed-inv-${invIdx}`;
    const invNumber = `INV-2026-${String(invIdx).padStart(5, '0')}`;
    const sub = subscriptionsToInsert[invIdx * 5]; // spread across subscriptions
    const subtotal = 498.0;
    const taxTotal = 74.7;
    const totalAmount = 572.7;

    const invStatus = invoiceStatuses[invIdx % invoiceStatuses.length];
    const isPaid = invStatus === 'PAID';
    const paidAmount = isPaid ? totalAmount : (invIdx % 4 === 0 ? 200.0 : 0.0); // some partial payments!

    const daysOffset = (invIdx % 60) - 15; // some overdue (past due date)
    const issuedDate = new Date(Date.now() - (daysOffset + 30) * 24 * 60 * 60 * 1000);
    const dueDate = new Date(Date.now() - daysOffset * 24 * 60 * 60 * 1000);

    const monthStr = String(issuedDate.getMonth() + 1).padStart(2, '0');
    const billingPeriod = `${issuedDate.getFullYear()}-${monthStr}`;

    invoicesToInsert.push({
      id: invId,
      invoiceNumber: invNumber,
      subscriptionId: sub ? sub.id : null,
      customerId: sub ? sub.customerId : createdCustomers[invIdx % createdCustomers.length].id,
      billingPeriod: `${billingPeriod}-${invIdx}`, // ensure unique
      status: invStatus,
      issuedDate,
      dueDate,
      subtotal,
      taxTotal,
      discountTotal: 0,
      totalAmount,
      paidAmount,
      sentAt: issuedDate,
      notes: `Automated invoice cycle #${invIdx}`,
      createdAt: issuedDate,
      updatedAt: new Date(),
    });

    invoiceLinesToInsert.push({
      id: `seed-invline-${invIdx}`,
      invoiceId: invId,
      productId: p1.id,
      description: 'Cloud Dedicated Cluster - Plan: Professional Monthly',
      quantity: 2,
      unitPrice: 249.0,
      taxRate: 15.0,
      taxAmount: 74.7,
      discountAmount: 0,
      lineTotal: 572.7,
      taxSnapshotJson: JSON.stringify({ ruleName: 'Standard VAT', ratePercent: 15.0 }),
    });

    if (paidAmount > 0) {
      paymentsToInsert.push({
        id: `seed-pay-${invIdx}`,
        invoiceId: invId,
        amount: paidAmount,
        paymentMethod: payMethods[invIdx % payMethods.length],
        paymentDate: new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        reference: `PAY-TX-${100000 + invIdx}`,
        notes: isPaid ? 'Full settlement' : 'Partial milestone payment',
        createdById: staff2.id,
        createdAt: new Date(),
      });
    }
  }

  for (let c = 0; c < invoicesToInsert.length; c += CHUNK_SIZE) {
    await prisma.invoice.createMany({ data: invoicesToInsert.slice(c, c + CHUNK_SIZE) });
    await prisma.invoiceLine.createMany({ data: invoiceLinesToInsert.slice(c, c + CHUNK_SIZE) });
  }

  for (let c = 0; c < paymentsToInsert.length; c += CHUNK_SIZE) {
    await prisma.payment.createMany({ data: paymentsToInsert.slice(c, c + CHUNK_SIZE) });
  }

  console.log(`✅ 350 Invoices and ${paymentsToInsert.length} Payments inserted with full histories!`);
  console.log('\n🎉 Database Seed Complete! Ready for demonstration.');
}

main()
  .catch((e) => {
    console.error('Seed script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
