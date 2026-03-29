import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// DELETE /api/pos/held/[id] — remove a held sale (after resuming)
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.heldSale.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[HELD DELETE]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
