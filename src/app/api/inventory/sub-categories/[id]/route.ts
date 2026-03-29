import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // Check for duplicate name within same category
    if (parsed.data.name) {
      const existing = await prisma.subCategory.findFirst({
        where: {
          id:  { not: params.id },
        },
      });
      const current = await prisma.subCategory.findUnique({ where: { id: params.id } });
      if (current && parsed.data.name) {
        // Case-insensitive duplicate check within same category
        const all = await prisma.subCategory.findMany({
          where: { category_id: current.category_id, id: { not: params.id } },
          select: { name: true },
        });
        const nameLower = parsed.data.name.trim().toLowerCase();
        if (all.some(s => s.name.toLowerCase() === nameLower)) {
          return NextResponse.json({ error: 'Sub-category name already exists in this category' }, { status: 409 });
        }
      }
    }

    const item = await prisma.subCategory.update({
      where: { id: params.id },
      data:  parsed.data,
    });
    return NextResponse.json(item);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update sub-category' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.subCategory.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete sub-category' }, { status: 500 });
  }
}
