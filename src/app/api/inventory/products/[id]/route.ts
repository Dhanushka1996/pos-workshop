import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { productUpdateSchema } from '@/lib/validations/inventory';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const PRODUCT_INCLUDE = {
  category: true, sub_category: true, brand: true,
  supplier: true, base_uom: true, bulk_uom: true, barcodes: true,
} as const;

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({ where: { id: params.id }, include: PRODUCT_INCLUDE });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body   = await req.json();
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { barcodes, ...data } = parsed.data;

    // Check item_code uniqueness if changed
    if (data.item_code) {
      const conflict = await prisma.product.findFirst({
        where: { item_code: data.item_code, NOT: { id: params.id } },
      });
      if (conflict) return NextResponse.json({ error: 'Item code already exists' }, { status: 409 });
    }

    // Replace barcodes if provided
    if (barcodes !== undefined) {
      await prisma.barcode.deleteMany({ where: { product_id: params.id } });
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...data,
        barcodes: barcodes !== undefined
          ? { create: barcodes.map((b, i) => ({ barcode: b, is_primary: i === 0 })) }
          : undefined,
      },
      include: PRODUCT_INCLUDE,
    });

    return NextResponse.json(product);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
