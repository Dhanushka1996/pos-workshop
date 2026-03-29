import { NextResponse } from 'next/server';
import { peekDisassemblyRef } from '@/lib/sequences';

export const dynamic = 'force-dynamic';

/** GET /api/disassembly/next-ref — preview the next DSM reference (non-consuming). */
export async function GET() {
  try {
    const ref_number = await peekDisassemblyRef();
    return NextResponse.json({ ref_number });
  } catch (err) {
    console.error('[GET /api/disassembly/next-ref]', err);
    return NextResponse.json({ error: 'Failed to preview reference' }, { status: 500 });
  }
}
