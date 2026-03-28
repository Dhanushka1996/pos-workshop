import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { brandSchema } from '@/lib/validations/inventory';

async function brandExists(name: string, excludeId?: string): Promise<boolean> {
  const lower = name.trim().toLowerCase();
  const all   = await prisma.brand.findMany({ select: { id: true, name: true } });
  return all.some(b => b.name.toLowerCase() === lower && b.id !== excludeId);
}

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(brands);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = brandSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    if (await brandExists(parsed.data.name)) {
      return NextResponse.json({ error: 'Brand already exists' }, { status: 409 });
    }

    const brand = await prisma.brand.create({
      data:    { ...parsed.data, name: parsed.data.name.trim() },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(brand, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
  }
}
