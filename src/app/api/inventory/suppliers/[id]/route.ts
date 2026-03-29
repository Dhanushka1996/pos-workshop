import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supplierUpdateSchema } from '@/lib/validations/inventory';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(supplier);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body   = await req.json();
    const parsed = supplierUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const supplier = await prisma.supplier.update({ where: { id: params.id }, data: { ...parsed.data, email: parsed.data.email || null } });
    return NextResponse.json(supplier);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.supplier.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 });
  }
}
