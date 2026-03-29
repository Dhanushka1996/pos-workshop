import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  mode: z.enum(['manual', 'equal', 'proportional']).default('manual'),
  components: z.array(z.object({
    id:             z.string().min(1),
    allocated_cost: z.number().min(0),
  })).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const assembly = await prisma.assembly.findUnique({
      where: { id: params.id },
      include: { components: true },
    });
    if (!assembly) return NextResponse.json({ error: 'Assembly not found' }, { status: 404 });

    const { mode, components: inputComponents } = parsed.data;
    const totalBudget = assembly.purchase_cost;

    let updates: { id: string; allocated_cost: number }[] = [];

    if (mode === 'equal') {
      const perComp = assembly.components.length > 0
        ? totalBudget / assembly.components.length
        : 0;
      updates = assembly.components.map(c => ({ id: c.id, allocated_cost: Math.round(perComp * 100) / 100 }));

    } else if (mode === 'proportional') {
      const totalQty = assembly.components.reduce((s, c) => s + c.qty_total, 0);
      updates = assembly.components.map(c => ({
        id:             c.id,
        allocated_cost: totalQty > 0
          ? Math.round((c.qty_total / totalQty) * totalBudget * 100) / 100
          : 0,
      }));

    } else {
      // manual
      if (!inputComponents?.length) {
        return NextResponse.json({ error: 'Components required for manual mode' }, { status: 422 });
      }
      updates = inputComponents.map(c => ({ id: c.id, allocated_cost: c.allocated_cost }));
    }

    // Apply updates in transaction
    await prisma.$transaction(
      updates.map(u =>
        prisma.assemblyComponent.update({
          where: { id: u.id },
          data:  { allocated_cost: u.allocated_cost },
        }),
      ),
    );

    const updated = await prisma.assembly.findUnique({
      where: { id: params.id },
      include: {
        components: { include: { product: { select: { id: true, name: true, item_code: true } } } },
      },
    });

    return NextResponse.json({
      success: true,
      total_allocated: updates.reduce((s, u) => s + u.allocated_cost, 0),
      assembly: updated,
    });
  } catch (err) {
    console.error('[cost-distribution]', err);
    return NextResponse.json({ error: 'Failed to distribute costs' }, { status: 500 });
  }
}
