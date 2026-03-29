import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoiceRef } from '@/lib/sequences';

export const dynamic = 'force-dynamic';

interface PaymentInput  { method: string; amount: number; reference?: string }
interface CartItemInput {
  product_id: string;
  quantity:   number;
  unit_price: number;
  cost_price: number;
  discount:   number;
  total:      number;
}

// POST /api/pos/sales — finalise a sale
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      items:        CartItemInput[];
      payments:     PaymentInput[];
      subtotal:     number;
      discount:     number;
      tax:          number;
      total:        number;
      paid_amount:  number;
      change_amount:number;
      payment_type: string;
      notes?:       string;
    };

    const { items, payments, subtotal, discount, tax, total, paid_amount, change_amount, payment_type, notes } = body;

    if (!items?.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 422 });
    }

    const sale = await prisma.$transaction(async (tx) => {
      // ── 1. Stock validation ────────────────────────────────────────
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.product_id } });
        if (!product) throw new Error(`Product not found: ${item.product_id}`);
        if (product.track_stock && product.current_stock < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}" — available: ${product.current_stock}, requested: ${item.quantity}`);
        }
      }

      // ── 2. Create Sale record ──────────────────────────────────────
      const saleNumber = await generateInvoiceRef();

      const created = await tx.sale.create({
        data: {
          sale_number:   saleNumber,
          subtotal,
          discount,
          tax,
          total,
          paid_amount,
          change_amount,
          payment_type,
          status:        'completed',
          notes:         notes ?? null,
          items: {
            create: items.map(i => ({
              product_id: i.product_id,
              quantity:   i.quantity,
              unit_price: i.unit_price,
              cost_price: i.cost_price,
              discount:   i.discount,
              total:      i.total,
            })),
          },
          payments: {
            create: payments.map(p => ({
              method:    p.method,
              amount:    p.amount,
              reference: p.reference ?? null,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, item_code: true, name: true } },
            },
          },
          payments: true,
        },
      });

      // ── 3. Reduce stock + create movements ────────────────────────
      for (const item of created.items) {
        const product = await tx.product.findUnique({ where: { id: item.product_id } });
        if (!product || !product.track_stock) continue;

        const newStock = product.current_stock - item.quantity;

        await tx.product.update({
          where: { id: item.product_id },
          data:  { current_stock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            product_id: item.product_id,
            type:       'SALE',
            quantity:   -item.quantity,
            balance:    newStock,
            reference:  saleNumber,
            cost_price: item.cost_price,
            notes:      `Sale ${saleNumber}`,
          },
        });
      }

      return created;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    console.error('[POS SALE POST]', err);
    const msg = err instanceof Error ? err.message : 'Failed to create sale';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/pos/sales — recent sales list
export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '50');
    const sales = await prisma.sale.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        items:    { include: { product: { select: { name: true, item_code: true } } } },
        payments: true,
      },
    });
    return NextResponse.json(sales);
  } catch (err) {
    console.error('[POS SALE GET]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
