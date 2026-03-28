import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { z } from 'zod';

const updateSchema = z.object({
  qty_total:      z.number().positive().optional(),
  allocated_cost: z.number().min(0).optional(),
  notes:          z.string().optional(),
});

// PUT /api/assemblies/[id]/components/[componentId]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; componentId: string } },
) {
  try {
    const { prisma } = await import('@/lib/prisma'); // ✅ ADD THIS

    const component = await prisma.assemblyComponent.findFirst({
      where: { id: params.componentId, assembly_id: params.id },
    });
    if (!component) return NextResponse.json({ error: 'Component not found' }, { status: 404 });

    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    // qty_total cannot go below already-extracted amount
    if (parsed.data.qty_total !== undefined && parsed.data.qty_total < component.qty_extracted) {
      return NextResponse.json(
        { error: `Cannot set qty lower than already-extracted amount (${component.qty_extracted})` },
        { status: 422 },
      );
    }

    const updated = await prisma.assemblyComponent.update({
      where: { id: params.componentId },
      data:  parsed.data,
      include: { product: { select: { id: true, item_code: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PUT /api/assemblies/[id]/components/[componentId]]', err);
    return NextResponse.json({ error: 'Failed to update component' }, { status: 500 });
  }
}

// DELETE /api/assemblies/[id]/components/[componentId]
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; componentId: string } },
) {
  try {
    const component = await prisma.assemblyComponent.findFirst({
      where: { id: params.componentId, assembly_id: params.id },
    });
    if (!component) return NextResponse.json({ error: 'Component not found' }, { status: 404 });

    if (component.qty_extracted > 0) {
      return NextResponse.json(
        { error: 'Cannot remove a component that has already been partially or fully extracted.' },
        { status: 409 },
      );
    }

    await prisma.assemblyComponent.delete({ where: { id: params.componentId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/assemblies/[id]/components/[componentId]]', err);
    return NextResponse.json({ error: 'Failed to remove component' }, { status: 500 });
  }
}
