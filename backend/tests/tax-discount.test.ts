import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { Money } from '../src/utils/money';
import { signToken } from '../src/utils/jwt';

describe('Tax and Discount Calculation Precision', () => {
  let adminToken: string;

  beforeAll(() => {
    adminToken = signToken({
      userId: 'test-admin',
      email: 'admin@brightloop.io',
      role: 'ADMIN',
      customerId: null,
    });
  });

  it('should accurately calculate financial rounding with ROUND_HALF_UP', () => {
    // Exact half-up rounding checks
    expect(Money.round(10.555)).toBe(10.56);
    expect(Money.round(10.554)).toBe(10.55);
    expect(Money.round(10.5555)).toBe(10.56);

    // Exact arithmetic
    expect(Money.add(0.1, 0.2)).toBe(0.3); // avoids standard float 0.30000000000000004
    expect(Money.multiply(199.99, 3)).toBe(599.97);
  });

  it('should accurately compute percentage tax rate on gross amount', () => {
    const gross = 250.0;
    const taxRate = 15.0; // 15% VAT
    const tax = Money.calcPercentage(gross, taxRate);
    expect(tax).toBe(37.5);

    const total = Money.add(gross, tax);
    expect(total).toBe(287.5);
  });

  it('should validate percentage discount with minimum purchase threshold', async () => {
    const res = await request(app)
      .post('/api/discounts/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'WELCOME20',
        subtotal: 500.0,
        totalQuantity: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.discount.code).toBe('WELCOME20');
    // 20% on 500 = 100
    expect(res.body.data.calculatedDiscount).toBe(100.0);
  });

  it('should reject discount when minimum purchase requirement is not met', async () => {
    const res = await request(app)
      .post('/api/discounts/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'WELCOME20',
        subtotal: 50.0, // min purchase is 100
        totalQuantity: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MIN_PURCHASE_NOT_MET');
  });

  it('should validate fixed discount capped to subtotal', async () => {
    const res = await request(app)
      .post('/api/discounts/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'FLAT50',
        subtotal: 300.0,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.calculatedDiscount).toBe(50.0);
  });
});
