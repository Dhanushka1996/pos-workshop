import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { brandUpdateSchema } from '@/lib/validations/inventory';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

async function brandExists(name: string, excludeId: string): Promise<boolean> {
  const lower = name.trim().toLowerCase();
  const all   = await prisma.brand.findMany({ select: { id: true, name: true } });
  return all.some(b => b.name.toLowerCase() === lower && b.id !== excludeId);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body   = await req.json();
    const parsed = brandUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    if (parsed.data.name && await brandExists(parsed.data.name, params.id)) {
      return NextResponse.json({ error: 'Brand name already exists' }, { status: 409 });
    }

    const brand = await prisma.brand.update({
      where:   { id: params.id },
      data:    { ...parsed.data, ...(parsed.data.name && { name: parsed.data.name.trim() }) },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(brand);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const count = await prisma.product.count({ where: { brand_id: params.id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${count} product(s) use this brand. Reassign them first.` },
        { status: 409 },
      );
    }
    await prisma.brand.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
