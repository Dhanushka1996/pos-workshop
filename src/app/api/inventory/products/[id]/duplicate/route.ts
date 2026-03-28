import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const source = await prisma.product.findUnique({
      where: { id: params.id },
      include: { barcodes: true },
    });
    if (!source) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Generate a unique item code (append -COPY, or -COPY2, -COPY3, …)
    let suffix = '-COPY';
    let attempt = 0;
    let newCode = '';
    while (true) {
      newCode = source.item_code + suffix;
      const conflict = await prisma.product.findUnique({ where: { item_code: newCode } });
      if (!conflict) break;
      attempt++;
      suffix = `-COPY${attempt + 1}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, item_code, current_stock, created_at, updated_at, barcodes, ...rest } = source;

    const duplicate = await prisma.product.create({
      data: {
        ...rest,
        item_code:     newCode,
        current_stock: 0,      // start fresh – stock belongs to original
        name:          `${source.name} (Copy)`,
      },
      include: {
        category:     true,
        sub_category: true,
        brand:        true,
        supplier:     true,
        base_uom:     true,
        bulk_uom:     true,
        barcodes:     { orderBy: { is_primary: 'desc' as const } },
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (err) {
    console.error('[POST /products/:id/duplicate]', err);
    return NextResponse.json({ error: 'Failed to duplicate product' }, { status: 500 });
  }
}
