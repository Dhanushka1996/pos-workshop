import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stockAdjustmentSchema } from '@/lib/validations/inventory';

// POST /api/inventory/stock-adjustment
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = stockAdjustmentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { product_id, type, quantity, notes, reference } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: product_id } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Determine direction
    const isDeduction = type === 'DISPATCH';
    const delta       = isDeduction ? -quantity : quantity;
    const newStock    = product.current_stock + delta;

    if (newStock < 0) {
      return NextResponse.json({ error: `Insufficient stock. Available: ${product.current_stock}` }, { status: 400 });
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: product_id },
        data:  { current_stock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          product_id,
          type,
          quantity: isDeduction ? -quantity : quantity,
          balance:  newStock,
          reference,
          notes,
        },
      }),
    ]);

    return NextResponse.json({ product: updatedProduct, movement }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to process adjustment' }, { status: 500 });
  }
}
