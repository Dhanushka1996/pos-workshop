/**
 * Item Master — Import Engine  (SERVER-SIDE ONLY — uses xlsx)
 * ─────────────────────────────────────────────────────────────
 * Exports (xlsx-dependent):
 *   parseExcelBuffer(buffer)   → ImportRow[]    legacy: auto-maps + validates
 *   parseExcelToRaw(buffer)    → RawImportData  new: returns raw columns + rows
 *   parseTsvToRaw(text)        → RawImportData  new: parses TSV/clipboard text
 *   parseExcelToRaw + autoDetectColumns → column-mapping UI workflow
 *   buildTemplate()            → Buffer
 *   buildErrorReport(rows)     → Buffer
 */

import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// ── Raw import data shape ─────────────────────────────────────────────────
/** Raw spreadsheet contents before any column mapping or validation. */
export interface RawImportData {
  headers: string[];
  rows:    string[][];
}

/** One auto-detected column → system field mapping. */
export interface ColumnDef {
  colIndex: number;
  header:   string;
  field:    keyof ImportRowData | null;
}

// ── Column aliases ────────────────────────────────────────────────────────
// Maps any reasonable header variation → internal field name.
// Used by BOTH Excel and TSV parsers.
export const COLUMN_ALIASES: Record<string, keyof ImportRowData> = {
  // Item Code
  'item code': 'item_code', 'item_code': 'item_code', 'itemcode': 'item_code',
  'code': 'item_code', 'sku': 'item_code', 'part no': 'item_code',
  'part number': 'item_code', 'part#': 'item_code', 'product code': 'item_code',

  // Name
  'item name': 'name', 'item_name': 'name', 'itemname': 'name',
  'name': 'name', 'product name': 'name', 'product': 'name',
  'description': 'name', 'part name': 'name', 'title': 'name',

  // Category
  'category': 'category', 'cat': 'category', 'category name': 'category',
  'product category': 'category',

  // Sub Category
  'sub category': 'sub_category', 'sub_category': 'sub_category',
  'subcategory': 'sub_category', 'sub cat': 'sub_category', 'subcat': 'sub_category',
  'sub-category': 'sub_category',

  // Brand
  'brand': 'brand', 'make': 'brand', 'manufacturer': 'brand', 'brand name': 'brand',
  'brand/make': 'brand',

  // Supplier
  'supplier': 'supplier', 'vendor': 'supplier', 'supplier name': 'supplier',
  'distributor': 'supplier',

  // Prices
  'cost price': 'cost_price', 'cost_price': 'cost_price', 'cost': 'cost_price',
  'purchase price': 'cost_price', 'buying price': 'cost_price', 'buy price': 'cost_price',
  'retail price': 'retail_price', 'retail_price': 'retail_price',
  'selling price': 'retail_price', 'sale price': 'retail_price',
  'price': 'retail_price', 'mrp': 'retail_price', 'list price': 'retail_price',
  'wholesale price': 'wholesale_price', 'wholesale_price': 'wholesale_price',
  'wholesale': 'wholesale_price', 'trade price': 'wholesale_price', 'dealer price': 'wholesale_price',
  'minimum price': 'min_price', 'min_price': 'min_price',
  'min price': 'min_price', 'minimum': 'min_price', 'floor price': 'min_price',

  // Reorder
  'reorder level': 'reorder_level', 'reorder_level': 'reorder_level',
  'min stock': 'reorder_level', 'minimum stock': 'reorder_level',
  'reorder point': 'reorder_level', 'min qty': 'reorder_level',
  'reorder qty': 'reorder_qty', 'reorder_qty': 'reorder_qty',
  'reorder quantity': 'reorder_qty', 'order qty': 'reorder_qty', 'reorder amount': 'reorder_qty',

  // Unit
  'base unit': 'base_unit', 'base_unit': 'base_unit',
  'unit': 'base_unit', 'uom': 'base_unit', 'unit of measure': 'base_unit',
  'unit of measurement': 'base_unit',

  // Barcode
  'barcode': 'barcode', 'bar code': 'barcode', 'ean': 'barcode',
  'ean13': 'barcode', 'upc': 'barcode', 'scan code': 'barcode', 'qr': 'barcode',
};

// ── Template columns (canonical order) ───────────────────────────────────
export const TEMPLATE_HEADERS = [
  'Item Code', 'Item Name', 'Category', 'Sub Category', 'Brand', 'Supplier',
  'Cost Price', 'Retail Price', 'Wholesale Price', 'Minimum Price',
  'Reorder Level', 'Reorder Qty', 'Base Unit', 'Barcode',
] as const;

// ── Types ────────────────────────────────────────────────────────────────
export interface ImportRowData {
  item_code:       string;
  name:            string;
  category:        string;
  sub_category:    string;
  brand:           string;
  supplier:        string;
  cost_price:      number;
  retail_price:    number;
  wholesale_price: number;
  min_price:       number;
  reorder_level:   number;
  reorder_qty:     number;
  base_unit:       string;
  barcode:         string;
}

export type RowStatus = 'valid' | 'error' | 'duplicate' | 'exists';

export interface ImportRow {
  rowNum:        number;
  data:          ImportRowData;
  status:        RowStatus;
  errors:        string[];
  existingId?:   string;
  existingName?: string;
}

export interface ImportSummary {
  total:      number;
  valid:      number;
  errors:     number;
  duplicates: number;
  existing:   number;
  newCount:   number;
}

export interface ExecuteResult {
  created: number;
  updated: number;
  skipped: number;
  failed:  number;
  errors:  Array<{ rowNum: number; item_code: string; error: string }>;
}

// ── Coercion helpers ─────────────────────────────────────────────────────
function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? fallback : Math.max(0, n);
}

export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Given an array of raw header strings, returns a ColumnDef for each one
 * with the best-guess system field mapping (or null if unrecognised).
 */
export function autoDetectColumns(headers: string[]): ColumnDef[] {
  return headers.map((header, colIndex) => ({
    colIndex,
    header,
    field: (COLUMN_ALIASES[normalizeHeader(header)] ?? null) as keyof ImportRowData | null,
  }));
}

// ── Column mapper ────────────────────────────────────────────────────────
// Given an array of raw header strings, returns a Map<colIndex → fieldName>.
function mapHeaders(headers: string[]): Map<number, keyof ImportRowData> {
  const m = new Map<number, keyof ImportRowData>();
  headers.forEach((h, i) => {
    const field = COLUMN_ALIASES[normalizeHeader(h)];
    if (field) m.set(i, field);
  });
  return m;
}

// ── Core row validator ───────────────────────────────────────────────────
// Takes a mapped record, row number, and the in-file dedup tracker.
// Returns a fully validated ImportRow.
function buildImportRow(
  mapped: Partial<Record<keyof ImportRowData, unknown>>,
  rowNum: number,
  seenCodes: Map<string, number>,
): ImportRow {
  const data: ImportRowData = {
    item_code:       toStr(mapped.item_code),
    name:            toStr(mapped.name),
    category:        toStr(mapped.category),
    sub_category:    toStr(mapped.sub_category),
    brand:           toStr(mapped.brand),
    supplier:        toStr(mapped.supplier),
    cost_price:      toNum(mapped.cost_price),
    retail_price:    toNum(mapped.retail_price),
    wholesale_price: toNum(mapped.wholesale_price),
    min_price:       toNum(mapped.min_price),
    reorder_level:   toNum(mapped.reorder_level, 5),
    reorder_qty:     toNum(mapped.reorder_qty, 10),
    base_unit:       toStr(mapped.base_unit),
    barcode:         toStr(mapped.barcode),
  };

  const errors: string[] = [];

  // Required field checks
  if (!data.item_code) errors.push('Item Code is required');
  if (!data.name)      errors.push('Item Name is required');

  // Price sanity
  if (data.cost_price < 0)        errors.push('Cost Price cannot be negative');
  if (data.retail_price < 0)      errors.push('Retail Price cannot be negative');
  if (data.min_price < 0)         errors.push('Minimum Price cannot be negative');
  if (data.wholesale_price < 0)   errors.push('Wholesale Price cannot be negative');

  // Price chain: cost ≤ min ≤ retail
  if (data.cost_price > 0 && data.retail_price > 0 && data.retail_price < data.cost_price) {
    errors.push(`Retail Price (${data.retail_price}) is less than Cost Price (${data.cost_price})`);
  }
  if (data.min_price > 0 && data.cost_price > 0 && data.min_price < data.cost_price) {
    errors.push(`Minimum Price (${data.min_price}) is below Cost Price (${data.cost_price})`);
  }
  if (data.min_price > 0 && data.retail_price > 0 && data.min_price > data.retail_price) {
    errors.push(`Minimum Price (${data.min_price}) exceeds Retail Price (${data.retail_price})`);
  }

  // In-file duplicate check
  const codeKey = data.item_code.toLowerCase();
  let status: RowStatus = errors.length > 0 ? 'error' : 'valid';

  if (data.item_code) {
    if (seenCodes.has(codeKey)) {
      errors.push(`Duplicate Item Code in file — first seen at row ${seenCodes.get(codeKey)}`);
      status = 'duplicate';
    } else {
      seenCodes.set(codeKey, rowNum);
    }
  }

  return { rowNum, data, status, errors };
}

// ── Shared row builder ───────────────────────────────────────────────────
// Maps a 2D array of cells using fieldByCol, then validates every row.
function processRows(
  fieldByCol:  Map<number, keyof ImportRowData>,
  rawRows:     unknown[][],
  startRowNum: number,
): ImportRow[] {
  const seenCodes = new Map<string, number>();
  const result: ImportRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const cells = rawRows[i];
    // Skip completely empty rows
    if (cells.every(c => toStr(c) === '')) continue;

    const mapped: Partial<Record<keyof ImportRowData, unknown>> = {};
    cells.forEach((val, colIdx) => {
      const field = fieldByCol.get(colIdx);
      if (field !== undefined) mapped[field] = val;
    });

    result.push(buildImportRow(mapped, startRowNum + i, seenCodes));
  }

  return result;
}

// ── Excel parser ────────────────────────────────────────────────────────
export function parseExcelBuffer(buffer: Buffer): ImportRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];

  const ws  = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1, defval: '', blankrows: false,
  });

  if (raw.length < 2) return [];

  const headerRowIdx = raw.findIndex(r => (r as unknown[]).some(c => toStr(c) !== ''));
  if (headerRowIdx === -1 || headerRowIdx >= raw.length - 1) return [];

  const rawHeaders  = (raw[headerRowIdx] as unknown[]).map(h => toStr(h));
  const fieldByCol  = mapHeaders(rawHeaders);
  if (fieldByCol.size === 0) return [];

  const dataRows   = raw.slice(headerRowIdx + 1) as unknown[][];
  return processRows(fieldByCol, dataRows, headerRowIdx + 2); // +2: 1-indexed + header row
}

// ── TSV / Clipboard parser ───────────────────────────────────────────────
// Accepts raw pasted text (Tab-Separated Values from Excel copy).
// Auto-detects header row; falls back to positional mapping.
export function parseTsvText(text: string): ImportRow[] {
  // Split into rows, split each by tab
  const allRows = text
    .trim()
    .split(/\r?\n/)
    .map(line => line.split('\t'))
    .filter(row => row.some(c => c.trim() !== ''));

  if (allRows.length === 0) return [];

  // Decide whether first row is a header row
  const firstRowCells   = allRows[0].map(c => c.trim());
  const headerMatchCount = firstRowCells.filter(
    h => COLUMN_ALIASES[normalizeHeader(h)] !== undefined,
  ).length;
  const hasHeaders = headerMatchCount >= 1;

  let fieldByCol: Map<number, keyof ImportRowData>;
  let dataRows:   string[][];
  let startRowNum: number;

  if (hasHeaders) {
    fieldByCol  = mapHeaders(firstRowCells);
    dataRows    = allRows.slice(1).map(r => r.map(c => c.trim()));
    startRowNum = 2;
  } else {
    // Positional fallback: map by TEMPLATE_HEADERS order
    fieldByCol = mapHeaders([...TEMPLATE_HEADERS]);
    dataRows   = allRows.map(r => r.map(c => c.trim()));
    startRowNum = 1;
  }

  return processRows(fieldByCol, dataRows as unknown[][], startRowNum);
}

// ── Summary builder ──────────────────────────────────────────────────────
export function buildSummary(rows: ImportRow[]): ImportSummary {
  return {
    total:      rows.length,
    valid:      rows.filter(r => r.status === 'valid').length,
    errors:     rows.filter(r => r.status === 'error').length,
    duplicates: rows.filter(r => r.status === 'duplicate').length,
    existing:   rows.filter(r => r.status === 'exists').length,
    newCount:   rows.filter(r => r.status === 'valid').length,
  };
}

// ── Template workbook ────────────────────────────────────────────────────
export function buildTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  const sampleRows = [
    ['BRK-001', 'Brake Pad Front (Toyota)', 'Brakes',    'Disc Brakes',   'Brembo', 'AutoParts Ltd',  1500, 2200, 1950, 1650, 5,  20, 'Piece',  '4901234567890'],
    ['OIL-001', 'Engine Oil 5W-30 1L',      'Lubricants','Engine Oil',    'Mobil',  'AutoParts Ltd',   800, 1200, 1050,  900, 10, 50, 'Bottle', ''],
    ['FIL-001', 'Oil Filter (Universal)',   'Filters',   'Engine Filters','Denso',  'MotorSupply Co',  350,  550,  480,  400, 5,  30, 'Piece',  ''],
  ];

  const wsData = [[...TEMPLATE_HEADERS], ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 15 }, { wch: 36 }, { wch: 18 }, { wch: 18 },
    { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 12 },
    { wch: 12 }, { wch: 20 },
  ];
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };

  XLSX.utils.book_append_sheet(wb, ws, 'Items');

  const inst = XLSX.utils.aoa_to_sheet([
    ['POS Workshop — Item Import Template'],
    [''],
    ['REQUIRED FIELDS',              'Item Code, Item Name'],
    ['OPTIONAL FIELDS',              'All other columns are optional'],
    [''],
    ['RULES'],
    ['• Item Code',                  'Must be unique (used as primary key for updates)'],
    ['• Category / Brand / Supplier','Auto-created if they do not exist yet'],
    ['• Prices',                     'Must be ≥ 0 · Retail ≥ Minimum ≥ Cost recommended'],
    ['• Barcode',                    'Leave empty if not applicable'],
    ['• Column headers',             'Do not rename — system uses them to identify columns'],
    ['• Sample rows',                'Delete rows 2–4 before importing your real data'],
    [''],
    ['CLIPBOARD PASTE'],
    ['You can also copy rows from any spreadsheet and paste directly into the Import page.'],
    ['Include the header row for best results. Columns are auto-detected.'],
  ]);
  inst['!cols'] = [{ wch: 30 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, inst, 'Instructions');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// ── Error report workbook ────────────────────────────────────────────────
export function buildErrorReport(failedRows: ImportRow[]): Buffer {
  const wb  = XLSX.utils.book_new();
  const hdr = [...TEMPLATE_HEADERS, 'Row #', 'Errors'];

  const dataRows = failedRows.map(r => [
    r.data.item_code,    r.data.name,          r.data.category,
    r.data.sub_category, r.data.brand,         r.data.supplier,
    r.data.cost_price,   r.data.retail_price,  r.data.wholesale_price,
    r.data.min_price,    r.data.reorder_level, r.data.reorder_qty,
    r.data.base_unit,    r.data.barcode,
    r.rowNum,            r.errors.join(' | '),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([hdr, ...dataRows]);
  ws['!cols'] = [
    { wch: 15 }, { wch: 32 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 18 }, { wch: 11 }, { wch: 11 },
    { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 11 },
    { wch: 12 }, { wch: 18 }, { wch: 7  }, { wch: 60 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Errors');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// ── Raw Excel parser (new) ────────────────────────────────────────────────
// Returns the spreadsheet as plain string arrays — NO mapping, NO validation.
// The column-mapping UI uses this to let the user configure before import.
export function parseExcelToRaw(buffer: Buffer): RawImportData {
  const wb        = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const ws  = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1, defval: '', blankrows: false,
  });

  if (raw.length < 1) return { headers: [], rows: [] };

  // First non-empty row = headers
  const headerRowIdx = raw.findIndex(r => (r as unknown[]).some(c => String(c).trim() !== ''));
  if (headerRowIdx === -1) return { headers: [], rows: [] };

  const headers  = (raw[headerRowIdx] as unknown[]).map(h => String(h === null || h === undefined ? '' : h).trim());
  const colCount = headers.length;

  const rows = (raw.slice(headerRowIdx + 1) as unknown[][])
    .filter(r => r.some(c => String(c ?? '').trim() !== ''))
    .map(r => {
      // Pad short rows to match header count
      const cells = r.map(c => String(c === null || c === undefined ? '' : c));
      while (cells.length < colCount) cells.push('');
      return cells;
    });

  return { headers, rows };
}

// ── Raw TSV parser (new) ──────────────────────────────────────────────────
// Accepts clipboard text (Tab-Separated Values copied from Excel).
// Auto-detects if the first row is a header row.
// Returns plain string arrays — NO mapping, NO validation.
export function parseTsvToRaw(text: string): RawImportData {
  const allRows = text
    .trim()
    .split(/\r?\n/)
    .map(line => line.split('\t').map(c => c.trim()))
    .filter(row => row.some(c => c !== ''));

  if (allRows.length === 0) return { headers: [], rows: [] };

  const firstRow = allRows[0];

  // Detect header row: ≥1 cells match known column aliases
  const matchCount = firstRow.filter((h: string) => COLUMN_ALIASES[normalizeHeader(h)]).length;
  const hasHeaders = matchCount >= 1 || allRows.length === 1;

  if (hasHeaders) {
    return { headers: firstRow, rows: allRows.slice(1) };
  }

  // No recognised headers — generate Column A, B, C …
  const colCount = Math.max(...allRows.map(r => r.length));
  const headers  = Array.from({ length: colCount }, (_, i) =>
    `Column ${i < 26 ? String.fromCharCode(65 + i) : `(${i + 1})`}`,
  );
  return { headers, rows: allRows };
}

