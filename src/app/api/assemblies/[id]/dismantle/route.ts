import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const dismantleSchema = z.object({
  extractions: z.array(z.object({
    component_id: z.string().min(1),  // AssemblyComponent.id
    qty:          z.number().positive(),
  })).min(1, 'At least one component must be selected for extraction'),
  notes: z.string().optional(),
});

/**
 * POST /api/assemblies/[id]/dismantle
 *
 * The core extraction engine. Transactionally:
 *   1. Validates each extraction (qty <= remaining)
 *   2. Updates AssemblyComponent.qty_extracted
 *   3. Increases each component Product.current_stock
 *   4. Creates StockMovement records (type: DISMANTLE_IN)
 *   5. Creates DismantleLog entries
 *   6. Recomputes and updates Assembly.status
 *
 * NEVER writes partial results — the whole operation is atomic.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body   = await req.json();
    const parsed = dismantleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { extractions, notes } = parsed.data;

    // ── Fetch assembly with full component detail ──────────────────────
    const assembly = await prisma.assembly.findUnique({
      where:   { id: params.id },
      include: {
        product:    { select: { id: true, item_code: true, name: true, track_stock: true, current_stock: true } },
        components: {
          include: {
            product: {
              select: {
                id: true, item_code: true, name: true,
                cost_price: true, track_stock: true, current_stock: true,
              },
            },
          },
        },
      },
    });

    if (!assembly) return NextResponse.json({ error: 'Assembly not found' }, { status: 404 });
    if (assembly.status === 'complete') {
      return NextResponse.json({ error: 'This assembly is fully dismantled — nothing left to extract' }, { status: 422 });
    }

    // ── Validate every extraction before touching the DB ──────────────
    const errors: string[] = [];

    for (const ext of extractions) {
      const comp = assembly.components.find(c => c.id === ext.component_id);
      if (!comp) {
        errors.push(`Component ${ext.component_id} not found in this assembly`);
        continue;
      }
      const remaining = comp.qty_total - comp.qty_extracted;
      if (remaining <= 0) {
        errors.push(`${comp.product.name}: already fully extracted`);
        continue;
      }
      if (ext.qty > remaining) {
        errors.push(`${comp.product.name}: requested ${ext.qty} but only ${remaining} remaining`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' | ') }, { status: 422 });
    }

    // ── Execute atomically ────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const logs: { componentName: string; qty: number }[] = [];

      for (const ext of extractions) {
        const comp = assembly.components.find(c => c.id === ext.component_id)!;

        // Cost per unit = allocated_cost / qty_total  (or fallback to product cost_price)
        const unitCost = comp.qty_total > 0 && comp.allocated_cost > 0
          ? comp.allocated_cost / comp.qty_total
          : comp.product.cost_price;

        // Update extracted qty on the component
        await tx.assemblyComponent.update({
          where: { id: comp.id },
          data:  { qty_extracted: { increment: ext.qty } },
        });

        // Increase component stock
        const updatedProduct = await tx.product.update({
          where: { id: comp.product_id },
          data:  { current_stock: { increment: comp.product.track_stock ? ext.qty : 0 } },
        });

        // Stock movement — component in
        if (comp.product.track_stock) {
          await tx.stockMovement.create({
            data: {
              product_id: comp.product_id,
              type:       'DISMANTLE_IN',
              quantity:   ext.qty,
              balance:    updatedProduct.current_stock,
              reference:  `ASM-${params.id.slice(-8).toUpperCase()}`,
              notes:      notes ?? `Extracted from: ${assembly.product.name}${assembly.reference ? ` (${assembly.reference})` : ''}`,
              cost_price: unitCost,
            },
          });
        }

        // DismantleLog
        await tx.dismantleLog.create({
          data: {
            assembly_id:           params.id,
            assembly_component_id: comp.id,
            product_id:            comp.product_id,
            qty_extracted:         ext.qty,
            notes,
          },
        });

        logs.push({ componentName: comp.product.name, qty: ext.qty });
      }

      // ── Recompute assembly status ─────────────────────────────────
      const freshComponents = await tx.assemblyComponent.findMany({
        where:  { assembly_id: params.id },
        select: { qty_total: true, qty_extracted: true },
      });

      const totalUnits    = freshComponents.reduce((s, c) => s + c.qty_total, 0);
      const extractedUnits = freshComponents.reduce((s, c) => s + c.qty_extracted, 0);

      const newStatus: string =
        extractedUnits === 0          ? 'intact' :
        extractedUnits >= totalUnits  ? 'complete' :
                                        'partial';

      // Reduce assembly parent stock if tracking and fully dismantled
      if (newStatus === 'complete' && assembly.product.track_stock) {
        const updatedParent = await tx.product.update({
          where: { id: assembly.product_id },
          data:  { current_stock: { decrement: 1 } },
        });

        await tx.stockMovement.create({
          data: {
            product_id: assembly.product_id,
            type:       'DISMANTLE_OUT',
            quantity:   -1,
            balance:    updatedParent.current_stock,
            reference:  `ASM-${params.id.slice(-8).toUpperCase()}`,
            notes:      `Assembly fully dismantled${assembly.reference ? ` (${assembly.reference})` : ''}`,
            cost_price: assembly.purchase_cost,
          },
        });
      }

      await tx.assembly.update({
        where: { id: params.id },
        data:  { status: newStatus },
      });

      return { logs, newStatus, extractedCount: logs.length };
    });

    return NextResponse.json({
      success:        true,
      status:         result.newStatus,
      extracted:      result.extractedCount,
      summary:        result.logs,
    });
  } catch (err) {
    console.error('[POST /api/assemblies/[id]/dismantle]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Dismantling failed' },
      { status: 500 },
    );
  }
}
