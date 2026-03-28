import { NextRequest, NextResponse } from 'next/server';
import { parseExcelToRaw, parseTsvToRaw, autoDetectColumns } from '@/lib/import/itemImport';

/**
 * POST /api/import/items/parse-raw
 *
 * Accepts either:
 *   - multipart/form-data  with a "file" field  (Excel .xlsx/.xls)
 *   - application/json     with a "text" field  (TSV clipboard text)
 *
 * Returns:
 *   {
 *     headers:     string[]        – raw column headers
 *     rows:        string[][]      – raw data rows (strings only, no mapping)
 *     autoColumns: ColumnDef[]     – auto-detected column → system field mapping
 *     rowCount:    number
 *   }
 *
 * NO data is written to the database. Pure parsing only.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    // ── EXCEL upload ───────────────────────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const fileObj = file as File;
      const ext     = fileObj.name.split('.').pop()?.toLowerCase() ?? '';

      if (!['xlsx', 'xls', 'xlsm'].includes(ext)) {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload an .xlsx or .xls file.' },
          { status: 400 },
        );
      }
      if (fileObj.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
      }

      const buffer  = Buffer.from(await fileObj.arrayBuffer());
      const raw     = parseExcelToRaw(buffer);

      if (raw.headers.length === 0) {
        return NextResponse.json(
          { error: 'Could not find a header row in the file.' },
          { status: 400 },
        );
      }
      if (raw.rows.length === 0) {
        return NextResponse.json(
          { error: 'The file has headers but no data rows.' },
          { status: 400 },
        );
      }
      if (raw.rows.length > 5000) {
        return NextResponse.json(
          { error: 'File contains more than 5,000 rows. Please split into smaller batches.' },
          { status: 400 },
        );
      }

      return NextResponse.json({
        headers:     raw.headers,
        rows:        raw.rows,
        autoColumns: autoDetectColumns(raw.headers),
        rowCount:    raw.rows.length,
      });
    }

    // ── TSV / clipboard paste ──────────────────────────────────────────
    if (contentType.includes('application/json')) {
      const body = await req.json() as { text?: string };
      const text = body.text?.trim() ?? '';

      if (!text) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
      }

      const raw = parseTsvToRaw(text);

      if (raw.headers.length === 0) {
        return NextResponse.json(
          { error: 'Could not detect any columns in the pasted data.' },
          { status: 400 },
        );
      }
      if (raw.rows.length === 0) {
        return NextResponse.json(
          { error: 'No data rows found in the pasted text.' },
          { status: 400 },
        );
      }
      if (raw.rows.length > 5000) {
        return NextResponse.json(
          { error: 'Pasted data exceeds 5,000 rows. Please split into smaller batches.' },
          { status: 400 },
        );
      }

      return NextResponse.json({
        headers:     raw.headers,
        rows:        raw.rows,
        autoColumns: autoDetectColumns(raw.headers),
        rowCount:    raw.rows.length,
      });
    }

    return NextResponse.json(
      { error: 'Unsupported Content-Type. Use multipart/form-data (file) or application/json (text).' },
      { status: 415 },
    );
  } catch (err) {
    console.error('[parse-raw]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Parse failed' },
      { status: 500 },
    );
  }
}
