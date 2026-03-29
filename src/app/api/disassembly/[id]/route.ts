import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

/** GET /api/disassembly/[id] — full detail including components and stock movements. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const record = await prisma.disassembly.findUnique({
      where: { id: params.id },
      include: {
        product: {
          select: {
            id: true, item_code: true, name: true,
            current_stock: true, product_type: true,
            brand:    { select: { name: true } },
            category: { select: { name: true } },
          },
        },
        components: {
          include: {
            product: {
              select: {
                id: true, item_code: true, name: true,
                current_stock: true, cost_price: true,
                brand:    { select: { name: true } },
                category: { select: { name: true } },
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Disassembly record not found' }, { status: 404 });
    }

    // Fetch related stock movements for this ref_number
    const movements = await prisma.stockMovement.findMany({
      where:   { reference: record.ref_number },
      include: { product: { select: { id: true, item_code: true, name: true } } },
      orderBy: { created_at: 'asc' },
    });

    return NextResponse.json({ ...record, movements });
  } catch (err) {
    console.error('[GET /api/disassembly/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 });
  }
}
