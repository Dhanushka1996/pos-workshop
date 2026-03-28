import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const grn = await prisma.gRN.findUnique({
      where: { id: params.id },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        items: {
          include: {
            product: {
              select: {
                id: true, item_code: true, name: true,
                retail_price: true, product_type: true, is_assembly: true,
              },
            },
            assemblies: {
              select: {
                id: true, ref_number: true, status: true, purchase_cost: true,
                components: { select: { id: true } },
              },
            },
          },
        },
        batches: { select: { id: true, batch_number: true, quantity: true, cost_price: true } },
      },
    });

    if (!grn) return NextResponse.json({ error: 'GRN not found' }, { status: 404 });
    return NextResponse.json(grn);
  } catch (err) {
    console.error('[GRN GET id]', err);
    return NextResponse.json({ error: 'Failed to fetch GRN' }, { status: 500 });
  }
}
