import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/pos/search?q=<query>
// Ultra-fast product search for POS (name, item_code, barcode)
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json([]);

  try {
    const products = await prisma.product.findMany({
      where: {
        is_active: true,
        OR: [
          { name:      { contains: q } },
          { item_code: { contains: q } },
          { barcodes:  { some: { barcode: { contains: q } } } },
        ],
      },
      select: {
        id:            true,
        item_code:     true,
        name:          true,
        retail_price:  true,
        cost_price:    true,
        current_stock: true,
        track_stock:   true,
        product_type:  true,
        min_price:     true,
        category: { select: { name: true } },
      },
      take: 12,
      orderBy: [
        { current_stock: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(products);
  } catch (err) {
    console.error('[POS SEARCH]', err);
    return NextResponse.json([], { status: 500 });
  }
}
