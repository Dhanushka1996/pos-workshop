import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supplierSchema } from '@/lib/validations/inventory';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(suppliers);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const supplier = await prisma.supplier.create({ data: { ...parsed.data, email: parsed.data.email || null } });
    return NextResponse.json(supplier, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}
