import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { categoryUpdateSchema } from '@/lib/validations/inventory';

export const dynamic = 'force-dynamic';

async function categoryExists(name: string, excludeId: string): Promise<boolean> {
  const lower = name.trim().toLowerCase();
  const all   = await prisma.category.findMany({ select: { id: true, name: true } });
  return all.some(c => c.name.toLowerCase() === lower && c.id !== excludeId);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body   = await req.json();
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    if (parsed.data.name && await categoryExists(parsed.data.name, params.id)) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
    }

    const category = await prisma.category.update({
      where:   { id: params.id },
      data:    { ...parsed.data, ...(parsed.data.name && { name: parsed.data.name.trim() }) },
      include: { sub_categories: true, _count: { select: { products: true } } },
    });
    return NextResponse.json(category);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if category has products
    const count = await prisma.product.count({ where: { category_id: params.id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${count} product(s) use this category. Reassign them first.` },
        { status: 409 },
      );
    }
    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
