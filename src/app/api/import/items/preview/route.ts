import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseExcelBuffer, buildSummary, type ImportRow } from '@/lib/import/itemImport';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

/**
 * POST /api/import/items/preview
 * Accepts multipart/form-data with a single "file" field (Excel).
 * Returns parsed + validated rows with DB-existence check — no data is written.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileObj  = file as File;
    const ext      = fileObj.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'xlsm'].includes(ext ?? '')) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload an .xlsx or .xls file.' },
        { status: 400 },
      );
    }

    // 10 MB size guard
    if (fileObj.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await fileObj.arrayBuffer());
    const rows   = parseExcelBuffer(buffer);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found. Ensure the file has a header row and at least one data row.' },
        { status: 400 },
      );
    }

    if (rows.length > 5000) {
      return NextResponse.json(
        { error: 'File contains more than 5,000 rows. Please split into smaller batches.' },
        { status: 400 },
      );
    }

    // ── Batch DB existence check ───────────────────────────────────────
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

    // Annotate rows with DB existence status
    const annotated: ImportRow[] = rows.map(row => {
      if (row.status === 'error' || row.status === 'duplicate') return row;
      const found = existingMap.get(row.data.item_code.toLowerCase());
      if (found) {
        return {
          ...row,
          status:       'exists' as const,
          existingId:   found.id,
          existingName: found.name,
        };
      }
      return row;
    });

    const summary = buildSummary(annotated);

    return NextResponse.json({ rows: annotated, summary });
  } catch (err) {
    console.error('[preview] error:', err);
    const msg = err instanceof Error ? err.message : 'Preview failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
