import { Request } from 'express';
import { prisma } from '../config/db';

export async function createAuditLog(
  req: Request | null,
  action: string,
  entity: string,
  entityId?: string | null,
  payload?: any
) {
  try {
    const userId = (req as any)?.user?.userId || null;
    const ipAddress = req ? (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || null : null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || null,
        payloadJson: payload ? JSON.stringify(payload) : null,
        ipAddress: typeof ipAddress === 'string' ? ipAddress.slice(0, 45) : null,
      },
    });
  } catch (err) {
    // Non-blocking: fail safe so business logic continues even if audit logging encounters an issue
    console.error('Audit log write failed:', err);
  }
}
