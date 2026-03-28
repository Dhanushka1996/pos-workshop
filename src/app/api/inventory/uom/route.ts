import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uomSchema } from '@/lib/validations/inventory';

export async function GET() {
  try {
    const uoms = await prisma.unitOfMeasure.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(uoms);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch UOMs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = uomSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const uom = await prisma.unitOfMeasure.create({ data: parsed.data });
    return NextResponse.json(uom, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create UOM' }, { status: 500 });
  }
}
