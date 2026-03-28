import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const last = await prisma.product.findFirst({ orderBy: { created_at: 'desc' }, select: { item_code: true } });
    let next = 'ITM00001';
    if (last?.item_code?.match(/^ITM\d+$/)) {
      const num = parseInt(last.item_code.replace('ITM', '')) + 1;
      next = `ITM${String(num).padStart(5, '0')}`;
    }
    return NextResponse.json({ item_code: next });
  } catch (err) {
    return NextResponse.json({ item_code: 'ITM00001' });
  }
}
