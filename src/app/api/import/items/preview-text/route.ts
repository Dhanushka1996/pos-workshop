import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseTsvText, buildSummary, type ImportRow } from '@/lib/import/itemImport';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

/**
 * POST /api/import/items/preview-text
 * Body: { text: string }  — raw tab-separated clipboard data from Excel
 *
 * Returns the same { rows, summary } shape as /api/import/items/preview
 * so the frontend can feed it into the shared preview table.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text?: string };
    const { text } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Rough size guard (~1 MB of text ≈ ~5,000 rows of 14 columns)
    if (text.length > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Pasted text is too large (max ~2 MB). Use file upload for very large imports.' },
        { status: 400 },
      );
    }

    const rows = parseTsvText(text);

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            'No data rows detected. Make sure you copied from Excel and the data is tab-separated.',
        },
        { status: 400 },
      );
    }

    if (rows.length > 5000) {
      return NextResponse.json(
        { error: 'Paste contains more than 5,000 rows. Please split into smaller batches.' },
        { status: 400 },
      );
    }

    // ── Batch DB existence check (same as file preview) ───────────────
    const uniqueCodes = Array.from(
      new Set(rows.filter(r => r.data.item_code).map(r => r.data.item_code)),
    );

    const existingProducts = await prisma.product.findMany({
      where:  { item_code: { in: uniqueCodes } },
      select: { id: true, item_code: true, name: true },
    });

    const existingMap = new Map(
      existingProducts.map(p => [p.item_code.toLowerCase(), p]),
    );

    const annotated: ImportRow[] = rows.map(row => {
      if (row.status === 'error' || row.status === 'duplicate') return row;
      const found = existingMap.get(row.data.item_code.toLowerCase());
      if (found) {
        return { ...row, status: 'exists' as const, existingId: found.id, existingName: found.name };
      }
      return row;
    });

    const summary = buildSummary(annotated);
    return NextResponse.json({ rows: annotated, summary });
  } catch (err) {
    console.error('[preview-text] error:', err);
    const msg = err instanceof Error ? err.message : 'Preview failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
