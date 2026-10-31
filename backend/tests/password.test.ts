import { describe, it, expect } from 'vitest';
import { validatePassword } from '../src/utils/password';

describe('Password Rule Validation', () => {
  it('should reject passwords of 8 characters or fewer', () => {
    expect(validatePassword('Ab1!').valid).toBe(false);
    expect(validatePassword('Abc1234!').valid).toBe(false); // exactly 8 characters
    expect(validatePassword('Abc1234!').message).toContain('more than 8 characters');
  });

  it('should reject passwords missing an uppercase letter', () => {
    const res = validatePassword('password123!');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('uppercase');
  });

  it('should reject passwords missing a lowercase letter', () => {
    const res = validatePassword('PASSWORD123!');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('lowercase');
  });

  it('should reject passwords missing a special character', () => {
    const res = validatePassword('Password12345');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('special character');
  });

  it('should accept valid passwords meeting all criteria (>8 chars, uppercase, lowercase, special char)', () => {
    expect(validatePassword('Admin@12345!').valid).toBe(true);
    expect(validatePassword('Secure#Pass2026').valid).toBe(true);
    expect(validatePassword('Super$Secret_99').valid).toBe(true);
  });
});
