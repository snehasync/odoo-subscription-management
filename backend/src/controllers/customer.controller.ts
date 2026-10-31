import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { createAuditLog } from '../services/audit.service';

export async function listCustomers(req: Request, res: Response) {
  try {
    const { search, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take,
        include: {
          _count: {
            select: { subscriptions: true, invoices: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: customers,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err: any) {
    console.error('ListCustomers error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch customers' } });
  }
}

export async function createCustomer(req: Request, res: Response) {
  try {
    const { name, email, company, address, phone, notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Customer name and email are required.' },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.customer.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'A customer with this email already exists.' },
      });
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        company: company || null,
        address: address || null,
        phone: phone || null,
        notes: notes || null,
      },
    });

    await createAuditLog(req, 'CUSTOMER_CREATED', 'Customer', customer.id, { name: customer.name, email: customer.email });

    return res.status(201).json({ success: true, data: customer });
  } catch (err: any) {
    console.error('CreateCustomer error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create customer' } });
  }
}

export async function updateCustomer(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, email, company, address, phone, notes } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (email !== undefined) data.email = email.trim().toLowerCase();
    if (company !== undefined) data.company = company;
    if (address !== undefined) data.address = address;
    if (phone !== undefined) data.phone = phone;
    if (notes !== undefined) data.notes = notes;

    const customer = await prisma.customer.update({
      where: { id },
      data,
    });

    await createAuditLog(req, 'CUSTOMER_UPDATED', 'Customer', customer.id, data);

    return res.json({ success: true, data: customer });
  } catch (err: any) {
    console.error('UpdateCustomer error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update customer' } });
  }
}
