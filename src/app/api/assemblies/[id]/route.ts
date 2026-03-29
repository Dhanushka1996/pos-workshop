import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { z } from 'zod';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  reference:     z.string().optional(),
  purchase_cost: z.number().min(0).optional(),
  notes:         z.string().optional(),
});

// GET /api/assemblies/[id] — full detail: assembly + components + history
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { prisma } = await import('@/lib/prisma'); // 
    const assembly = await prisma.assembly.findUnique({
      where: { id: params.id },
      include: {
        product: {
          select: {
            id: true, item_code: true, name: true, description: true,
            current_stock: true, cost_price: true, track_stock: true,
          },
        },
        components: {
          include: {
            product: {
              select: {
                id: true, item_code: true, name: true,
                cost_price: true, retail_price: true,
                current_stock: true, track_stock: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        dismantle_logs: {
          include: {
            product: { select: { id: true, item_code: true, name: true } },
          },
          orderBy: { created_at: 'desc' },
          take: 100,
        },
      },
    });

    if (!assembly) return NextResponse.json({ error: 'Assembly not found' }, { status: 404 });
    return NextResponse.json(assembly);
  } catch (err) {
    console.error('[GET /api/assemblies/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch assembly' }, { status: 500 });
  }
}

// PUT /api/assemblies/[id] — update header fields (reference, cost, notes)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const assembly = await prisma.assembly.update({
      where: { id: params.id },
      data:  parsed.data,
      include: {
        product:    { select: { id: true, item_code: true, name: true } },
        components: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(assembly);
  } catch (err) {
    console.error('[PUT /api/assemblies/[id]]', err);
    return NextResponse.json({ error: 'Failed to update assembly' }, { status: 500 });
  }
}

// DELETE /api/assemblies/[id] — only allowed if no extractions have been made
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const assembly = await prisma.assembly.findUnique({
      where:  { id: params.id },
      select: { id: true, status: true, _count: { select: { dismantle_logs: true } } },
    });

    if (!assembly) return NextResponse.json({ error: 'Assembly not found' }, { status: 404 });

    if (assembly._count.dismantle_logs > 0) {
      return NextResponse.json(
        { error: 'Cannot delete an assembly that has extraction history. Archive it instead.' },
        { status: 409 },
      );
    }

    await prisma.assembly.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/assemblies/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete assembly' }, { status: 500 });
  }
}
