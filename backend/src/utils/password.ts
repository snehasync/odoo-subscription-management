import bcrypt from 'bcryptjs';

/**
 * Password Rule:
 * - More than 8 characters (> 8 characters, so at least 9 characters)
 * - At least one uppercase letter ([A-Z])
 * - At least one lowercase letter ([a-z])
 * - At least one special character ([!@#$%^&*(),.?":{}|<>_\-+=\[\]\/\\`~])
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length <= 8) {
    return { valid: false, message: 'Password must be more than 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\/\\`~]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
