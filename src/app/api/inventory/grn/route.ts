import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { grnSchema } from '@/lib/validations/inventory';
import { generateGRNRef, generateAssemblyRef } from '@/lib/sequences';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// ── GET /api/inventory/grn ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page  = parseInt(searchParams.get('page')  ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const skip  = (page - 1) * limit;

    const [grns, total] = await Promise.all([
      prisma.gRN.findMany({
        include: {
          supplier: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, item_code: true, name: true, product_type: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.gRN.count(),
    ]);

    return NextResponse.json({ grns, total, page, limit });
  } catch (err) {
    console.error('[GRN GET]', err);
    return NextResponse.json({ error: 'Failed to fetch GRNs' }, { status: 500 });
  }
}

// ── POST /api/inventory/grn ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = grnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { supplier_id, invoice_number, received_date, notes, items } = parsed.data;
    const totalCost = items.reduce((sum, item) => sum + item.total, 0);
    const grnNumber = await generateGRNRef();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create GRN + line items
      const grn = await tx.gRN.create({
        data: {
          grn_number:     grnNumber,
          invoice_number: invoice_number || null,
          received_date:  received_date ? new Date(received_date) : null,
          supplier_id:    supplier_id || null,
          total_cost:     totalCost,
          notes:          notes || null,
          status:         'confirmed',
          items: {
            create: items.map(item => ({
              product_id: item.product_id,
              quantity:   item.quantity,
              cost_price: item.cost_price,
              total:      item.total,
            })),
          },
        },
        include: {
          supplier: { select: { id: true, name: true } },
          items: {
            include: {
              product: {
                select: { id: true, item_code: true, name: true, product_type: true, current_stock: true },
              },
            },
          },
        },
      });

      const assembliesCreated: { ref_number: string; product_name: string; id: string }[] = [];

      // 2. Process each line item
      for (const grnItem of grn.items) {
        const product = grnItem.product;
        const newStock = product.current_stock + grnItem.quantity;

        // Update stock
        await tx.product.update({
          where: { id: product.id },
          data:  { current_stock: newStock, cost_price: grnItem.cost_price },
        });

        // Stock movement: GRN_IN
        await tx.stockMovement.create({
          data: {
            product_id: product.id,
            type:       'GRN',
            quantity:   grnItem.quantity,
            balance:    newStock,
            reference:  grnNumber,
            cost_price: grnItem.cost_price,
            notes:      `GRN ${grnNumber}${invoice_number ? ` · Inv ${invoice_number}` : ''}`,
          },
        });

        // Batch record
        await tx.batch.create({
          data: {
            product_id:    product.id,
            grn_id:        grn.id,
            batch_number:  `${grnNumber}-${product.id.slice(-4)}`,
            quantity:      grnItem.quantity,
            remaining_qty: grnItem.quantity,
            cost_price:    grnItem.cost_price,
          },
        });

        // 3. Auto-create Assembly records for ASSEMBLY-type products
        if (product.product_type === 'ASSEMBLY') {
          const units = Math.max(1, Math.floor(grnItem.quantity));
          for (let u = 0; u < units; u++) {
            const ref = await generateAssemblyRef();
            const asm = await tx.assembly.create({
              data: {
                product_id:    product.id,
                grn_item_id:   grnItem.id,
                ref_number:    ref,
                purchase_cost: grnItem.cost_price,
                status:        'intact',
                notes:         `Auto-created from ${grnNumber}`,
              },
            });
            assembliesCreated.push({ id: asm.id, ref_number: ref, product_name: product.name });
          }
        }
      }

      return { grn, assembliesCreated };
    });

    return NextResponse.json(
      { ...result.grn, assembliesCreated: result.assembliesCreated },
      { status: 201 },
    );
  } catch (err) {
    console.error('[GRN POST]', err);
    return NextResponse.json({ error: 'Failed to create GRN' }, { status: 500 });
  }
}
