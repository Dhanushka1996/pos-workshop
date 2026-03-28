import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      total_products,
      active_products,
      out_of_stock,
      all_products,
      recent_movements,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { is_active: true } }),
      prisma.product.count({ where: { current_stock: { lte: 0 } } }),
      prisma.product.findMany({ select: { current_stock: true, reorder_level: true, cost_price: true, retail_price: true } }),
      prisma.stockMovement.findMany({
        take:    10,
        orderBy: { created_at: 'desc' },
        include: { product: { select: { id: true, item_code: true, name: true } } },
      }),
    ]);

    const low_stock         = all_products.filter(p => p.current_stock > 0 && p.current_stock <= p.reorder_level).length;
    const total_stock_value = all_products.reduce((sum, p) => sum + p.current_stock * p.cost_price, 0);
    const total_retail_value = all_products.reduce((sum, p) => sum + p.current_stock * p.retail_price, 0);

    const low_stock_items = await prisma.product.findMany({
      where: { current_stock: { gt: 0 } },
      include: { category: true, brand: true, supplier: true, barcodes: true, sub_category: true, base_uom: true, bulk_uom: true },
      orderBy: { current_stock: 'asc' },
      take: 10,
    });

    return NextResponse.json({
      total_products,
      active_products,
      out_of_stock,
      low_stock,
      total_stock_value,
      total_retail_value,
      recent_movements,
      low_stock_items: low_stock_items.filter(p => p.current_stock <= p.reorder_level),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
