import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/pos/held — list all held sales
export async function GET() {
  try {
    const held = await prisma.heldSale.findMany({
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(held);
  } catch (err) {
    console.error('[HELD GET]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST /api/pos/held — save a held sale
export async function POST(req: NextRequest) {
  try {
    const { label, cart_data } = await req.json();
    const held = await prisma.heldSale.create({
      data: { label: label ?? null, cart_data },
    });
    return NextResponse.json(held, { status: 201 });
  } catch (err) {
    console.error('[HELD POST]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
