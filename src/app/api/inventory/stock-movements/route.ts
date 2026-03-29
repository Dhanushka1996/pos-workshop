import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get('product_id') ?? '';
    const type       = searchParams.get('type')       ?? '';
    const page       = parseInt(searchParams.get('page')  ?? '1');
    const limit      = parseInt(searchParams.get('limit') ?? '50');
    const skip       = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (product_id) where.product_id = product_id;
    if (type)       where.type       = type;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: { select: { id: true, item_code: true, name: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return NextResponse.json({ movements, total, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 });
  }
}
