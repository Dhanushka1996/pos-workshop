import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subCategorySchema } from '@/lib/validations/inventory';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

async function subCategoryExists(name: string, category_id: string, excludeId?: string): Promise<boolean> {
  const lower = name.trim().toLowerCase();
  const all   = await prisma.subCategory.findMany({
    where:  { category_id },
    select: { id: true, name: true },
  });
  return all.some(s => s.name.toLowerCase() === lower && s.id !== excludeId);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get('category_id');
    const where = category_id ? { category_id } : {};
    const items = await prisma.subCategory.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch sub-categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = subCategorySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    if (await subCategoryExists(parsed.data.name, parsed.data.category_id)) {
      return NextResponse.json({ error: 'Sub-category already exists in this category' }, { status: 409 });
    }

    const item = await prisma.subCategory.create({
      data:    { ...parsed.data, name: parsed.data.name.trim() },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create sub-category' }, { status: 500 });
  }
}
