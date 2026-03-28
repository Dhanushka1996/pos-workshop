import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { categorySchema } from '@/lib/validations/inventory';

// Case-insensitive duplicate check (works with SQLite + PostgreSQL)
async function categoryExists(name: string, excludeId?: string): Promise<boolean> {
  const lower = name.trim().toLowerCase();
  const all   = await prisma.category.findMany({ select: { id: true, name: true } });
  return all.some(c => c.name.toLowerCase() === lower && c.id !== excludeId);
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        sub_categories: { orderBy: { name: 'asc' } },
        _count:         { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    if (await categoryExists(parsed.data.name)) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    }

    const category = await prisma.category.create({
      data:    { ...parsed.data, name: parsed.data.name.trim() },
      include: { sub_categories: true, _count: { select: { products: true } } },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
