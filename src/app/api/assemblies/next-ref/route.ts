import { NextResponse } from 'next/server';
import { peekAssemblyRef, generateAssemblyItemCode } from '@/lib/sequences';

/**
 * GET /api/assemblies/next-ref
 * Returns a preview of the next assembly reference number (not consumed).
 * Also returns a suggested item code for a new assembly product.
 */
export async function GET() {
  try {
    const [ref_number, item_code] = await Promise.all([
      peekAssemblyRef(),
      // peek next item code without consuming
      (async () => {
        const { prisma } = await import('@/lib/prisma');
        const seq = await prisma.sequence.findUnique({ where: { key: 'assembly_item_code' } });
        const n = (seq?.value ?? 0) + 1;
        return `ASM${String(n).padStart(5, '0')}`;
      })(),
    ]);
    return NextResponse.json({ ref_number, item_code });
  } catch (err) {
    console.error('[GET /api/assemblies/next-ref]', err);
    return NextResponse.json({ ref_number: 'ASM-000001', item_code: 'ASM00001' });
  }
}
