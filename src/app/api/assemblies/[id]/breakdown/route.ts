export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { z } from 'zod';

export const runtime = "nodejs";
const schema = z.object({
  /**
   * IDs of AssemblyComponent records whose parts were SOLD or USED outside
   * the system. These components will have their qty_extracted bumped to
   * qty_total but NO DISMANTLE_IN stock movement is created for them.
   *
   * Every component NOT listed here is treated as "recovered" — a
   * DISMANTLE_IN movement is created and its product stock increases.
   */
  usedComponentIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

/**
 * POST /api/assemblies/[id]/breakdown
 *
 * "Partial Breakdown During Sale/Use"
 *
 * Atomically:
 *   1. Validates the assembly exists, is not already complete, and has stock
 *   2. For every component with remaining qty:
 *      - "used / sold" (listed in usedComponentIds) → qty_extracted++ only
 *      - "recovered"   (not listed)                 → qty_extracted++ + DISMANTLE_IN + DismantleLog
 *   3. Parent assembly product → DISMANTLE_OUT (–1)
 *   4. Assembly status → 'complete'
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { prisma } = await import('@/lib/prisma');
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { usedComponentIds, notes } = parsed.data;
    const usedSet = new Set(usedComponentIds);

    // ── Fetch assembly with product + all components ───────────────────────
    const assembly = await prisma.assembly.findUnique({
      where:   { id: params.id },
      include: {
        product: {
          select: {
            id: true, name: true, item_code: true,
            current_stock: true, track_stock: true,
          },
        },
        components: {
          include: {
            product: {
              select: {
                id: true, name: true, item_code: true,
                cost_price: true, track_stock: true, current_stock: true,
              },
            },
          },
        },
      },
    });

    if (!assembly) {
      return NextResponse.json({ error: 'Assembly not found' }, { status: 404 });
    }
    if (assembly.status === 'complete') {
      return NextResponse.json(
        { error: 'This assembly is already fully broken down — nothing left to process' },
        { status: 422 },
      );
    }
    if (assembly.components.length === 0) {
      return NextResponse.json(
        { error: 'Assembly has no components defined. Add components before running a breakdown.' },
        { status: 422 },
      );
    }

    // ── Stock check on parent ──────────────────────────────────────────────
    if (assembly.product.track_stock && assembly.product.current_stock < 1) {
      return NextResponse.json(
        { error: `No stock available for "${assembly.product.name}" (current stock: ${assembly.product.current_stock})` },
        { status: 422 },
      );
    }

    // ── Validate usedComponentIds belong to this assembly ─────────────────
    const validIds = new Set(assembly.components.map(c => c.id));
    for (const uid of usedComponentIds) {
      if (!validIds.has(uid)) {
        return NextResponse.json(
          { error: `Component ID "${uid}" does not belong to this assembly` },
          { status: 422 },
        );
      }
    }

    // ── Atomic transaction ─────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const recovered: { name: string; qty: number }[] = [];
      const sold:      { name: string; qty: number }[] = [];

      for (const comp of assembly.components) {
        const remainingQty = Math.max(0, comp.qty_total - comp.qty_extracted);
        if (remainingQty <= 0) continue; // already fully extracted — skip

        const isUsed = usedSet.has(comp.id);

        // Bring extracted qty up to total
        await tx.assemblyComponent.update({
          where: { id: comp.id },
          data:  { qty_extracted: comp.qty_total },
        });

        if (!isUsed) {
          // ── Recovered: add to stock ──────────────────────────────────
          const unitCost =
            comp.allocated_cost > 0 && comp.qty_total > 0
              ? comp.allocated_cost / comp.qty_total
              : comp.product.cost_price;

          if (comp.product.track_stock) {
            const updated = await tx.product.update({
              where: { id: comp.product_id },
              data:  { current_stock: { increment: remainingQty } },
            });

            await tx.stockMovement.create({
              data: {
                product_id: comp.product_id,
                type:       'DISMANTLE_IN',
                quantity:   remainingQty,
                balance:    updated.current_stock,
                reference:  assembly.ref_number ?? `ASM-${params.id.slice(-8).toUpperCase()}`,
                notes:      notes
                  ?? `Recovered from breakdown: ${assembly.product.name}${assembly.reference ? ` (${assembly.reference})` : ''}`,
                cost_price: unitCost,
              },
            });
          }

          await tx.dismantleLog.create({
            data: {
              assembly_id:           params.id,
              assembly_component_id: comp.id,
              product_id:            comp.product_id,
              qty_extracted:         remainingQty,
              notes:                 `[BREAKDOWN - RECOVERED] ${notes ?? ''}`.trim(),
            },
          });

          recovered.push({ name: comp.product.name, qty: remainingQty });
        } else {
          // ── Used / sold: log only, no stock movement ──────────────────
          await tx.dismantleLog.create({
            data: {
              assembly_id:           params.id,
              assembly_component_id: comp.id,
              product_id:            comp.product_id,
              qty_extracted:         remainingQty,
              notes:                 `[BREAKDOWN - SOLD/USED] ${notes ?? ''}`.trim(),
            },
          });

          sold.push({ name: comp.product.name, qty: remainingQty });
        }
      }

      // ── Parent assembly stock OUT ────────────────────────────────────────
      if (assembly.product.track_stock) {
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
            reference:  assembly.ref_number ?? `ASM-${params.id.slice(-8).toUpperCase()}`,
            notes:      `Assembly broken down${assembly.reference ? ` (${assembly.reference})` : ''}. Recovered: ${recovered.length}, sold/used: ${sold.length}`,
            cost_price: assembly.purchase_cost,
          },
        });
      }

      // ── Mark assembly complete ───────────────────────────────────────────
      await tx.assembly.update({
        where: { id: params.id },
        data:  { status: 'complete' },
      });

      return { recovered, sold };
    });

    return NextResponse.json({
      success:   true,
      status:    'complete',
      recovered: result.recovered,
      sold:      result.sold,
      summary: {
        recoveredCount: result.recovered.length,
        soldCount:      result.sold.length,
        message: [
          result.recovered.length > 0
            ? `${result.recovered.length} component type${result.recovered.length !== 1 ? 's' : ''} added to stock`
            : null,
          result.sold.length > 0
            ? `${result.sold.length} component type${result.sold.length !== 1 ? 's' : ''} logged as sold/used`
            : null,
        ].filter(Boolean).join(', '),
      },
    });
  } catch (err) {
    console.error('[POST /api/assemblies/[id]/breakdown]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Breakdown failed' },
      { status: 500 },
    );
  }
}
