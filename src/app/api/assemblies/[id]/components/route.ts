import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { z } from 'zod';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const addSchema = z.object({
  product_id:     z.string().min(1),
  qty_total:      z.number().positive(),
  allocated_cost: z.number().min(0).default(0),
  notes:          z.string().optional(),
});

// POST /api/assemblies/[id]/components — add a component to the assembly
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { prisma } = await import('@/lib/prisma'); // 
    const assembly = await prisma.assembly.findUnique({
      where:  { id: params.id },
      select: { id: true, product_id: true },
    });
    if (!assembly) return NextResponse.json({ error: 'Assembly not found' }, { status: 404 });

    const body   = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { product_id, qty_total, allocated_cost, notes } = parsed.data;

    if (product_id === assembly.product_id) {
      return NextResponse.json(
        { error: 'A component cannot be the same product as the assembly itself' },
        { status: 422 },
      );
    }

    // Check duplicate
    const exists = await prisma.assemblyComponent.findFirst({
      where: { assembly_id: params.id, product_id },
    });
    if (exists) {
      return NextResponse.json(
        { error: 'This product is already a component of this assembly. Update its quantity instead.' },
        { status: 409 },
      );
    }

    const component = await prisma.assemblyComponent.create({
      data: { assembly_id: params.id, product_id, qty_total, allocated_cost, notes },
      include: { product: { select: { id: true, item_code: true, name: true, retail_price: true, cost_price: true, current_stock: true } } },
    });

    return NextResponse.json(component, { status: 201 });
  } catch (err) {
    console.error('[POST /api/assemblies/[id]/components]', err);
    return NextResponse.json({ error: 'Failed to add component' }, { status: 500 });
  }
}
