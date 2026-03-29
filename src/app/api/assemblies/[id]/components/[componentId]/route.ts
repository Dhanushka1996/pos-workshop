import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  qty_total: z.coerce.number().positive().optional(),
  allocated_cost: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

// PUT /api/assemblies/[id]/components/[componentId]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; componentId: string } },
) {
  try {
    const assemblyId = params.id;
    const componentId = params.componentId;

    const component = await prisma.assemblyComponent.findFirst({
      where: {
        id: componentId,
        assembly_id: assemblyId, // ✅ correct based on your schema
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const data = parsed.data;

    // Prevent invalid qty
    if (
      data.qty_total !== undefined &&
      data.qty_total < component.qty_extracted
    ) {
      return NextResponse.json(
        {
          error: `Cannot set qty lower than already-extracted amount (${component.qty_extracted})`,
        },
        { status: 422 }
      );
    }

    const updated = await prisma.assemblyComponent.update({
      where: {
        id: componentId, // ✅ OK because id is unique
      },
      data: data,
      include: {
        product: {
          select: {
            id: true,
            item_code: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PUT ERROR]', err);
    return NextResponse.json(
      { error: 'Failed to update component' },
      { status: 500 }
    );
  }
}

// DELETE /api/assemblies/[id]/components/[componentId]
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; componentId: string } },
) {
  try {
    const assemblyId = params.id;
    const componentId = params.componentId;

    const component = await prisma.assemblyComponent.findFirst({
      where: {
        id: componentId,
        assembly_id: assemblyId, // ✅ correct
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    if (component.qty_extracted > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot remove a component that has already been partially or fully extracted.',
        },
        { status: 409 }
      );
    }

    await prisma.assemblyComponent.delete({
      where: {
        id: componentId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE ERROR]', err);
    return NextResponse.json(
      { error: 'Failed to remove component' },
      { status: 500 }
    );
  }
}