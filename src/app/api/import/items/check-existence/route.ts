import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

/**
 * POST /api/import/items/check-existence
 * Body: { codes: string[] }
 *
 * Batch-checks which item codes already exist in the database.
 * Called after the user finalises column mappings so the preview table
 * can show "will update" vs "will create" for each row.
 *
 * Returns:
 *   { existing: Record<string, { id: string; name: string }> }
 *   where keys are item_code values (lowercased).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { codes?: unknown };

    if (!Array.isArray(body.codes)) {
      return NextResponse.json({ error: '"codes" must be an array' }, { status: 400 });
    }

    const codes: string[] = body.codes
      .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      .map(c => c.trim());

    if (codes.length === 0) {
      return NextResponse.json({ existing: {} });
    }

    // Cap to 5000 to prevent abuse
    const limited = codes.slice(0, 5000);

    const found = await prisma.product.findMany({
      where:  { item_code: { in: limited } },
      select: { id: true, item_code: true, name: true },
    });

    // Return as a lookup map keyed by lowercased item_code
    const existing: Record<string, { id: string; name: string }> = {};
    found.forEach(p => {
      existing[p.item_code.toLowerCase()] = { id: p.id, name: p.name };
    });

    return NextResponse.json({ existing });
  } catch (err) {
    console.error('[check-existence]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lookup failed' },
      { status: 500 },
    );
  }
}
