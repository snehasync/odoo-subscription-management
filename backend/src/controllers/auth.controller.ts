import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { validatePassword, hashPassword, comparePassword } from '../utils/password';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/jwt';
import { createAuditLog } from '../services/audit.service';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName, phone, role = 'CUSTOMER', company, address } = req.body;

    // Validate email
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'A valid email address is required.' },
      });
    }

    // Validate password complexity
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: passwordCheck.message },
      });
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists.' },
      });
    }

    // RBAC: Only Admin can create STAFF or ADMIN accounts
    let assignedRole = 'CUSTOMER';
    if (role === 'ADMIN' || role === 'STAFF') {
      if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only an Admin can create staff or admin accounts.' },
        });
      }
      assignedRole = role;
    }

    const passwordHash = await hashPassword(password);

    // Create user and link customer record if customer
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        fullName: (fullName || cleanEmail.split('@')[0]).trim(),
        phone: phone || null,
        role: assignedRole,
        ...(assignedRole === 'CUSTOMER' && {
          customer: {
            create: {
              name: (fullName || cleanEmail.split('@')[0]).trim(),
              email: cleanEmail,
              company: company || null,
              address: address || null,
              phone: phone || null,
            },
          },
        }),
      },
      include: { customer: true },
    });

    await createAuditLog(req, 'USER_REGISTER', 'User', user.id, {
      email: cleanEmail,
      role: assignedRole,
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customer?.id || null,
    });

    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          customerId: user.customer?.id || null,
        },
        token,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Registration failed. Please try again.' },
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CREDENTIALS', message: 'Email and password are required.' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { customer: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customer?.id || null,
    });

    setAuthCookie(res, token);

    await createAuditLog(req, 'USER_LOGIN', 'User', user.id, { email: cleanEmail });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          customerId: user.customer?.id || null,
        },
        token,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Login failed.' },
    });
  }
}

export async function logout(req: Request, res: Response) {
  clearAuthCookie(res);
  await createAuditLog(req, 'USER_LOGOUT', 'User', req.user?.userId || null);
  return res.json({ success: true, message: 'Logged out successfully.' });
}

export async function me(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not logged in.' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { customer: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User record not found.' },
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          customerId: user.customer?.id || null,
          customer: user.customer,
        },
      },
    });
  } catch (err: any) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve profile.' },
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    // Constant-time generic message to not reveal account existence
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been dispatched.',
    };

    if (!cleanEmail) {
      return res.json(genericResponse);
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      // Sleep slightly to match hashing/db lookup time
      await new Promise((r) => setTimeout(r, 100));
      return res.json(genericResponse);
    }

    // Invalidate existing unused tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // Generate single-use token (expires in 1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Mock mailer / development console logging
    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
    console.log(`\n======================================================`);
    console.log(`[MOCK MAILER] Password Reset for ${cleanEmail}`);
    console.log(`[MOCK MAILER] Single-Use Reset URL: ${resetUrl}`);
    console.log(`[MOCK MAILER] Token Expires At: ${expiresAt.toISOString()}`);
    console.log(`======================================================\n`);

    await createAuditLog(req, 'PASSWORD_RESET_REQUESTED', 'User', user.id, { email: cleanEmail });

    return res.json({
      ...genericResponse,
      // Include devToken in development environment for seamless testing
      ...(process.env.NODE_ENV !== 'production' && { devToken: token }),
    });
  } catch (err: any) {
    console.error('ForgotPassword error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Unable to process reset request.' },
    });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Reset token is required.' },
      });
    }

    // Validate password complexity
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: passwordCheck.message },
      });
    }

    // Look up token
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'This password reset link is invalid, expired, or has already been used.',
        },
      });
    }

    const newHash = await hashPassword(newPassword);

    // Atomically update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await createAuditLog(req, 'PASSWORD_RESET_COMPLETED', 'User', resetRecord.userId);

    return res.json({
      success: true,
      message: 'Password has been successfully updated. You can now sign in.',
    });
  } catch (err: any) {
    console.error('ResetPassword error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reset password.' },
    });
  }
}
