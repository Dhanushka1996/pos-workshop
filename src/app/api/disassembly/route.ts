import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { generateDisassemblyRef } from '@/lib/sequences';

export const dynamic = 'force-dynamic';

// ─── Validation schema ────────────────────────────────────────────────────────

const componentSchema = z.object({
  product_id: z.string().min(1, 'Component product is required'),
  qty:        z.number().positive('Quantity must be positive'),
  unit_cost:  z.number().min(0).default(0),
  condition:  z.enum(['good', 'damaged', 'scrap']).default('good'),
  recovered:  z.boolean().default(true),
  notes:      z.string().optional(),
});

const createSchema = z.object({
  product_id: z.string().min(1, 'Parent product is required'),
  quantity:   z.number().positive('Quantity must be positive'),
  unit_cost:  z.number().min(0).default(0),
  notes:      z.string().optional(),
  components: z.array(componentSchema).min(1, 'At least one component is required'),
});

// ─── GET /api/disassembly ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.trim() ?? '';
    const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));

    const where = search ? {
      OR: [
        { ref_number: { contains: search } },
        { product: { name:      { contains: search } } },
        { product: { item_code: { contains: search } } },
      ],
    } : {};

    const [total, records] = await Promise.all([
      prisma.disassembly.count({ where }),
      prisma.disassembly.findMany({
        where,
        include: {
          product: {
            select: { id: true, item_code: true, name: true, current_stock: true },
          },
          components: {
            select: {
              id: true, qty: true, condition: true, recovered: true,
              product: { select: { id: true, item_code: true, name: true } },
            },
          },
          _count: { select: { components: true } },
        },
        orderBy: { created_at: 'desc' },
        skip:   (page - 1) * limit,
        take:   limit,
      }),
    ]);

    return NextResponse.json({ records, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[GET /api/disassembly]', err);
    return NextResponse.json({ error: 'Failed to fetch disassembly records' }, { status: 500 });
  }
}

// ─── POST /api/disassembly ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { product_id, quantity, unit_cost, notes, components } = parsed.data;

    // ── Pre-flight checks ──────────────────────────────────────────────────

    // 1. Parent product must exist
    const parent = await prisma.product.findUnique({
      where:  { id: product_id },
      select: { id: true, name: true, item_code: true, current_stock: true, track_stock: true },
    });
    if (!parent) {
      return NextResponse.json({ error: 'Parent product not found' }, { status: 404 });
    }

    // 2. Sufficient stock
    if (parent.track_stock && parent.current_stock < quantity) {
      return NextResponse.json({
        error: `Insufficient stock. Available: ${parent.current_stock}, requested: ${quantity}`,
      }, { status: 422 });
    }

    // 3. No component can be the same as parent
    if (components.some(c => c.product_id === product_id)) {
      return NextResponse.json(
        { error: 'A component cannot be the same product as the parent item' },
        { status: 422 },
      );
    }

    // 4. No duplicate components
    const compIds = components.map(c => c.product_id);
    if (new Set(compIds).size !== compIds.length) {
      return NextResponse.json({ error: 'Duplicate component products are not allowed' }, { status: 422 });
    }

    // 5. Validate all component products exist
    const compProducts = await prisma.product.findMany({
      where:  { id: { in: compIds } },
      select: { id: true, name: true, track_stock: true, current_stock: true },
    });
    if (compProducts.length !== compIds.length) {
      return NextResponse.json({ error: 'One or more component products not found' }, { status: 404 });
    }
    const compMap = new Map(compProducts.map(p => [p.id, p]));

    // ── Auto-generate reference ────────────────────────────────────────────
    const ref_number = await generateDisassemblyRef();

    // ── Atomic transaction ─────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {

      // Create the disassembly record
      const disassembly = await tx.disassembly.create({
        data: {
          ref_number,
          product_id,
          quantity,
          unit_cost,
          notes,
          components: {
            create: components.map(c => ({
              product_id: c.product_id,
              qty:        c.qty,
              unit_cost:  c.unit_cost,
              condition:  c.condition,
              recovered:  c.recovered,
              notes:      c.notes,
            })),
          },
        },
        include: {
          components: true,
        },
      });

      // ── Parent stock OUT ────────────────────────────────────────────────
      if (parent.track_stock) {
        const updatedParent = await tx.product.update({
          where: { id: product_id },
          data:  { current_stock: { decrement: quantity } },
        });

        await tx.stockMovement.create({
          data: {
            product_id,
            type:      'DISMANTLE_OUT',
            quantity:  -quantity,
            balance:   updatedParent.current_stock,
            reference: ref_number,
            notes:     notes ?? `Disassembled: ${parent.name} × ${quantity}`,
            cost_price: unit_cost,
          },
        });
      }

      // ── Component stock IN (for recovered parts only) ───────────────────
      for (const comp of components) {
        if (!comp.recovered) continue;              // skipped / already sold

        const compProduct = compMap.get(comp.product_id)!;
        if (!compProduct.track_stock) continue;     // untracked product

        // Total qty added = component qty × disassembly quantity
        const qtyIn = comp.qty * quantity;

        const updatedComp = await tx.product.update({
          where: { id: comp.product_id },
          data:  { current_stock: { increment: qtyIn } },
        });

        await tx.stockMovement.create({
          data: {
            product_id: comp.product_id,
            type:       'DISMANTLE_IN',
            quantity:   qtyIn,
            balance:    updatedComp.current_stock,
            reference:  ref_number,
            notes:      `Recovered from disassembly: ${parent.name} (${ref_number})`,
            cost_price: comp.unit_cost,
          },
        });
      }

      return disassembly;
    });

    // Return full record
    const full = await prisma.disassembly.findUnique({
      where:   { id: result.id },
      include: {
        product: {
          select: { id: true, item_code: true, name: true, current_stock: true },
        },
        components: {
          include: {
            product: { select: { id: true, item_code: true, name: true, current_stock: true } },
          },
        },
      },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (err) {
    console.error('[POST /api/disassembly]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create disassembly record' },
      { status: 500 },
    );
  }
}
