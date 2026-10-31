import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Money } from '../utils/money';
import { createAuditLog } from '../services/audit.service';

export async function listProducts(req: Request, res: Response) {
  try {
    const { type, search, activeOnly = 'true' } = req.query;

    const where: any = {};
    if (activeOnly === 'true') {
      where.active = true;
    }
    if (type && typeof type === 'string' && type !== 'ALL') {
      where.type = type;
    }
    if (search && typeof search === 'string') {
      where.name = { contains: search };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: products });
  } catch (err: any) {
    console.error('ListProducts error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch products' } });
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const { name, type = 'SERVICE', salesPrice, costPrice = 0, notes, variants = [] } = req.body;

    if (!name || salesPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Product name and sales price are required.' },
      });
    }

    const cleanSalesPrice = Money.round(salesPrice);
    const cleanCostPrice = Money.round(costPrice);

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        type,
        salesPrice: cleanSalesPrice,
        costPrice: cleanCostPrice,
        notes: notes || null,
        ...(Array.isArray(variants) && variants.length > 0 && {
          variants: {
            create: variants.map((v: any) => ({
              name: v.name.trim(),
              priceAdjustment: Money.round(v.priceAdjustment || 0),
              sku: v.sku || null,
            })),
          },
        }),
      },
      include: { variants: true },
    });

    await createAuditLog(req, 'PRODUCT_CREATED', 'Product', product.id, { name: product.name, salesPrice: cleanSalesPrice });

    return res.status(201).json({ success: true, data: product });
  } catch (err: any) {
    console.error('CreateProduct error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create product' } });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, type, salesPrice, costPrice, notes, active } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) data.type = type;
    if (salesPrice !== undefined) data.salesPrice = Money.round(salesPrice);
    if (costPrice !== undefined) data.costPrice = Money.round(costPrice);
    if (notes !== undefined) data.notes = notes;
    if (active !== undefined) data.active = Boolean(active);

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { variants: true },
    });

    await createAuditLog(req, 'PRODUCT_UPDATED', 'Product', product.id, data);

    return res.json({ success: true, data: product });
  } catch (err: any) {
    console.error('UpdateProduct error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update product' } });
  }
}

export async function addVariant(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, priceAdjustment = 0, sku } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Variant name is required.' },
      });
    }

    const cleanAdjustment = Money.round(priceAdjustment);

    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        name: name.trim(),
        priceAdjustment: cleanAdjustment,
        sku: sku || null,
      },
    });

    await createAuditLog(req, 'PRODUCT_VARIANT_ADDED', 'ProductVariant', variant.id, {
      productId: id,
      name: variant.name,
      priceAdjustment: cleanAdjustment,
    });

    return res.status(201).json({ success: true, data: variant });
  } catch (err: any) {
    console.error('AddVariant error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add variant' } });
  }
}

export async function deleteVariant(req: Request, res: Response) {
  try {
    const { variantId } = req.params;
    await prisma.productVariant.delete({ where: { id: variantId } });
    await createAuditLog(req, 'PRODUCT_VARIANT_DELETED', 'ProductVariant', variantId);
    return res.json({ success: true, message: 'Variant deleted.' });
  } catch (err: any) {
    console.error('DeleteVariant error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete variant' } });
  }
}
