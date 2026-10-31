import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { signToken } from '../src/utils/jwt';

describe('Subscription Status Transitions & RBAC', () => {
  let adminToken: string;
  let testCustomer: any;
  let testPlan: any;
  let testPlanNoRenewal: any;
  let testProduct: any;

  beforeAll(async () => {
    // Look up existing admin user
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) throw new Error('Admin user required for test');

    // Generate admin auth token with real database user ID
    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
      customerId: null,
    });

    testCustomer = await prisma.customer.findFirst();
    testPlan = await prisma.plan.findFirst({ where: { allowRenewal: true } });
    testPlanNoRenewal = await prisma.plan.findFirst({ where: { allowRenewal: false } });
    testProduct = await prisma.product.findFirst();
  });

  it('should enforce full valid status progression: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED', async () => {
    // 1. Create in DRAFT
    const createRes = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: testCustomer.id,
        planId: testPlan.id,
        lines: [{ productId: testProduct.id, quantity: 1, unitPrice: 100 }],
      });

    expect(createRes.status).toBe(201);
    const subId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe('DRAFT');

    // 2. DRAFT -> QUOTATION
    const toQuotation = await request(app)
      .post(`/api/subscriptions/${subId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'QUOTATION', reason: 'Sent quote to prospect' });
    expect(toQuotation.status).toBe(200);
    expect(toQuotation.body.data.status).toBe('QUOTATION');

    // 3. QUOTATION -> CONFIRMED
    const toConfirmed = await request(app)
      .post(`/api/subscriptions/${subId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'CONFIRMED', reason: 'Prospect agreed to terms' });
    expect(toConfirmed.status).toBe(200);
    expect(toConfirmed.body.data.status).toBe('CONFIRMED');

    // 4. CONFIRMED -> ACTIVE
    const toActive = await request(app)
      .post(`/api/subscriptions/${subId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'ACTIVE', reason: 'Service provisioned and activated' });
    expect(toActive.status).toBe(200);
    expect(toActive.body.data.status).toBe('ACTIVE');

    // 5. ACTIVE -> CLOSED
    const toClosed = await request(app)
      .post(`/api/subscriptions/${subId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'CLOSED', reason: 'Contract period ended' });
    expect(toClosed.status).toBe(200);
    expect(toClosed.body.data.status).toBe('CLOSED');
  });

  it('should reject illegal status skipping (e.g. DRAFT directly to ACTIVE)', async () => {
    const createRes = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: testCustomer.id,
        planId: testPlan.id,
        lines: [{ productId: testProduct.id, quantity: 1, unitPrice: 100 }],
      });

    expect(createRes.status).toBe(201);
    const subId = createRes.body.data.id;

    const invalidHop = await request(app)
      .post(`/api/subscriptions/${subId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'ACTIVE', reason: 'Skipping quotation' });

    expect(invalidHop.status).toBe(400);
    expect(invalidHop.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('should prevent renewal when plan.allowRenewal is false', async () => {
    if (!testPlanNoRenewal) return;

    // Create subscription on plan without renewal
    const createRes = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: testCustomer.id,
        planId: testPlanNoRenewal.id,
        lines: [{ productId: testProduct.id, quantity: 1, unitPrice: 100 }],
      });

    expect(createRes.status).toBe(201);
    const subId = createRes.body.data.id;

    // Close directly from DRAFT
    const closeRes = await request(app)
      .post(`/api/subscriptions/${subId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'CLOSED' });
    expect(closeRes.status).toBe(200);

    // Attempt to renew/reactivate
    const renewAttempt = await request(app)
      .post(`/api/subscriptions/${subId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'ACTIVE' });

    expect(renewAttempt.status).toBe(400);
    expect(renewAttempt.body.error.code).toBe('RENEWAL_DISALLOWED');
  });
});
