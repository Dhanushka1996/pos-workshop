import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { productSchema } from '@/lib/validations/inventory';

const PRODUCT_INCLUDE = {
  category:     true,
  sub_category: true,
  brand:        true,
  supplier:     true,
  base_uom:     true,
  bulk_uom:     true,
  barcodes:     { orderBy: { is_primary: 'desc' as const } },
} as const;

// Allowed sort fields mapped to Prisma orderBy keys
const SORT_FIELDS: Record<string, string> = {
  name:           'name',
  item_code:      'item_code',
  retail_price:   'retail_price',
  cost_price:     'cost_price',
  current_stock:  'current_stock',
  created_at:     'created_at',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search      = searchParams.get('search') ?? searchParams.get('q') ?? '';
    const category_id = searchParams.get('category_id') ?? '';
    const brand_id    = searchParams.get('brand_id')    ?? '';
    const status      = searchParams.get('status')      ?? '';
    const product_type = searchParams.get('product_type') ?? '';
    const sortBy      = searchParams.get('sortBy')      ?? 'name';
    const sortDir     = searchParams.get('sortDir')     === 'desc' ? 'desc' : 'asc';
    const page        = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit       = Math.min(200, parseInt(searchParams.get('limit') ?? '50'));
    const skip        = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name:      { contains: search } },
        { item_code: { contains: search } },
        { barcodes:  { some: { barcode: { contains: search } } } },
        { description: { contains: search } },
      ];
    }
    if (category_id) where.category_id = category_id;
    if (brand_id)    where.brand_id    = brand_id;
    if (status === 'active')       where.is_active     = true;
    if (status === 'inactive')     where.is_active     = false;
    if (status === 'out_of_stock') where.current_stock = { lte: 0 };
    if (product_type)              where.product_type  = product_type;

    const orderField = SORT_FIELDS[sortBy] ?? 'name';
    const orderBy = { [orderField]: sortDir };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include:  PRODUCT_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Post-filter for low_stock (needs per-row comparison)
    const result = status === 'low_stock'
      ? products.filter(p => p.current_stock > 0 && p.current_stock <= p.reorder_level)
      : products;

    return NextResponse.json({
      products: result,
      total:    status === 'low_stock' ? result.length : total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[GET /products]', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { barcodes, ...data } = parsed.data;

    // Unique item code check
    const existing = await prisma.product.findUnique({ where: { item_code: data.item_code } });
    if (existing) {
      return NextResponse.json({ error: 'Item code already exists' }, { status: 409 });
    }

    // Normalise empty optional FK strings to null
    const create = {
      ...data,
      category_id:     data.category_id     || null,
      sub_category_id: data.sub_category_id || null,
      brand_id:        data.brand_id        || null,
      supplier_id:     data.supplier_id     || null,
      base_uom_id:     data.base_uom_id     || null,
      bulk_uom_id:     data.bulk_uom_id     || null,
    };

    const product = await prisma.product.create({
      data: {
        ...create,
        barcodes: barcodes?.length
          ? { create: barcodes.map((b, i) => ({ barcode: b, is_primary: i === 0 })) }
          : undefined,
      },
      include: PRODUCT_INCLUDE,
    });

    // Opening stock movement
    if (data.current_stock > 0) {
      await prisma.stockMovement.create({
        data: {
          product_id: product.id,
          type:       'OPENING',
          quantity:   data.current_stock,
          balance:    data.current_stock,
          notes:      'Opening stock on item creation',
        },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error('[POST /products]', err);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
