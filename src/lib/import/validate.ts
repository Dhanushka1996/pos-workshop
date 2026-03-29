/**
 * Item Import — Client-Safe Validation & Mapping Engine
 * ───────────────────────────────────────────────────────
 * NO xlsx, NO Prisma, NO browser-only APIs.
 * Safe to import in both server API routes AND client components.
 *
 * This module owns:
 *   - All shared type definitions
 *   - Column alias mapping (header → field)
 *   - Auto-detection of column mappings from headers
 *   - Mapping application + row validation
 *   - localStorage template persistence
 */
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// ── System field definitions ───────────────────────────────────────────────
export const SYSTEM_FIELDS = [
  { value: 'item_code',       label: 'Item Code',        group: 'Core',   required: true  },
  { value: 'name',            label: 'Item Name',        group: 'Core',   required: true  },
  { value: 'category',        label: 'Category',         group: 'Master', required: false },
  { value: 'sub_category',    label: 'Sub Category',     group: 'Master', required: false },
  { value: 'brand',           label: 'Brand',            group: 'Master', required: false },
  { value: 'supplier',        label: 'Supplier',         group: 'Master', required: false },
  { value: 'cost_price',      label: 'Cost Price',       group: 'Prices', required: false },
  { value: 'retail_price',    label: 'Retail Price',     group: 'Prices', required: false },
  { value: 'wholesale_price', label: 'Wholesale Price',  group: 'Prices', required: false },
  { value: 'min_price',       label: 'Minimum Price',    group: 'Prices', required: false },
  { value: 'reorder_level',   label: 'Reorder Level',    group: 'Stock',  required: false },
  { value: 'reorder_qty',     label: 'Reorder Qty',      group: 'Stock',  required: false },
  { value: 'base_unit',       label: 'Base Unit',        group: 'Stock',  required: false },
  { value: 'barcode',         label: 'Barcode',          group: 'Other',  required: false },
] as const;

export type SystemFieldKey = (typeof SYSTEM_FIELDS)[number]['value'];

// ── Column header → system field aliases ──────────────────────────────────
// Maps every reasonable spreadsheet header variation to a system field.
export const COLUMN_ALIASES: Record<string, SystemFieldKey> = {
  // Item Code
  'item code': 'item_code', 'item_code': 'item_code', 'itemcode': 'item_code',
  'code': 'item_code', 'sku': 'item_code', 'part no': 'item_code',
  'part number': 'item_code', 'part#': 'item_code', 'product code': 'item_code',
  'prod code': 'item_code', 'product id': 'item_code', 'article no': 'item_code',

  // Name
  'item name': 'name', 'item_name': 'name', 'itemname': 'name',
  'name': 'name', 'product name': 'name', 'product': 'name',
  'description': 'name', 'part name': 'name', 'title': 'name',
  'product description': 'name', 'article name': 'name',

  // Category
  'category': 'category', 'cat': 'category', 'category name': 'category',
  'product category': 'category', 'main category': 'category',

  // Sub Category
  'sub category': 'sub_category', 'sub_category': 'sub_category',
  'subcategory': 'sub_category', 'sub cat': 'sub_category', 'subcat': 'sub_category',
  'sub-category': 'sub_category', 'product subcategory': 'sub_category',

  // Brand
  'brand': 'brand', 'make': 'brand', 'manufacturer': 'brand', 'brand name': 'brand',
  'brand/make': 'brand', 'mfr': 'brand', 'mfg': 'brand',

  // Supplier
  'supplier': 'supplier', 'vendor': 'supplier', 'supplier name': 'supplier',
  'distributor': 'supplier', 'source': 'supplier',

  // Cost Price
  'cost price': 'cost_price', 'cost_price': 'cost_price', 'cost': 'cost_price',
  'purchase price': 'cost_price', 'buying price': 'cost_price', 'buy price': 'cost_price',
  'landed cost': 'cost_price', 'pp': 'cost_price',

  // Retail Price
  'retail price': 'retail_price', 'retail_price': 'retail_price',
  'selling price': 'retail_price', 'sale price': 'retail_price',
  'price': 'retail_price', 'mrp': 'retail_price', 'list price': 'retail_price',
  'rsp': 'retail_price', 'sp': 'retail_price',

  // Wholesale Price
  'wholesale price': 'wholesale_price', 'wholesale_price': 'wholesale_price',
  'wholesale': 'wholesale_price', 'trade price': 'wholesale_price',
  'dealer price': 'wholesale_price', 'wp': 'wholesale_price',

  // Minimum Price
  'minimum price': 'min_price', 'min_price': 'min_price',
  'min price': 'min_price', 'minimum': 'min_price', 'floor price': 'min_price',
  'minimum selling price': 'min_price', 'mp': 'min_price',

  // Reorder Level
  'reorder level': 'reorder_level', 'reorder_level': 'reorder_level',
  'min stock': 'reorder_level', 'minimum stock': 'reorder_level',
  'reorder point': 'reorder_level', 'min qty': 'reorder_level', 'rop': 'reorder_level',

  // Reorder Qty
  'reorder qty': 'reorder_qty', 'reorder_qty': 'reorder_qty',
  'reorder quantity': 'reorder_qty', 'order qty': 'reorder_qty',
  'reorder amount': 'reorder_qty', 'roq': 'reorder_qty',

  // Base Unit
  'base unit': 'base_unit', 'base_unit': 'base_unit',
  'unit': 'base_unit', 'uom': 'base_unit', 'unit of measure': 'base_unit',
  'unit of measurement': 'base_unit', 'selling unit': 'base_unit',

  // Barcode
  'barcode': 'barcode', 'bar code': 'barcode', 'ean': 'barcode',
  'ean13': 'barcode', 'upc': 'barcode', 'scan code': 'barcode',
  'qr code': 'barcode', 'isbn': 'barcode',
};

export const TEMPLATE_HEADERS = [
  'Item Code', 'Item Name', 'Category', 'Sub Category', 'Brand', 'Supplier',
  'Cost Price', 'Retail Price', 'Wholesale Price', 'Minimum Price',
  'Reorder Level', 'Reorder Qty', 'Base Unit', 'Barcode',
] as const;

// ── Core types ─────────────────────────────────────────────────────────────
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

// ── Column mapping types ───────────────────────────────────────────────────
export interface ColumnDef {
  id:             string;             // stable ID: "col_0", "col_1" …
  colIndex:       number;             // original column index in the raw data
  originalHeader: string;             // header text from the spreadsheet
  mappedField:    SystemFieldKey | 'ignore';
  visible:        boolean;
  confidence:     'high' | 'none';   // whether auto-detection found a match
}

export interface RawImportData {
  headers: string[];   // raw header row
  rows:    string[][]; // all data rows (strings only)
}

// ── Mapping template (localStorage) ───────────────────────────────────────
export interface MappingTemplate {
  name:     string;
  // header.toLowerCase() → system field
  mappings: Record<string, SystemFieldKey | 'ignore'>;
  savedAt:  string;
}

const TEMPLATE_STORAGE_KEY = 'pos_col_mapping_templates';

export function saveMappingTemplate(name: string, columns: ColumnDef[]): void {
  if (typeof window === 'undefined') return;
  const all = getAllTemplates();
  const mappings: Record<string, SystemFieldKey | 'ignore'> = {};
  columns.forEach(c => { mappings[c.originalHeader.toLowerCase()] = c.mappedField; });
  all[name] = { name, mappings, savedAt: new Date().toISOString() };
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(all));
}

export function getAllTemplates(): Record<string, MappingTemplate> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) ?? '{}'); }
  catch { return {}; }
}

export function deleteTemplate(name: string): void {
  if (typeof window === 'undefined') return;
  const all = getAllTemplates();
  delete all[name];
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(all));
}

// ── Utilities ──────────────────────────────────────────────────────────────
export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

export function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? fallback : Math.max(0, n);
}

// ── Auto-detect mapping from raw headers ──────────────────────────────────
export function autoDetectColumns(headers: string[]): ColumnDef[] {
  return headers.map((header, i) => {
    const field = COLUMN_ALIASES[normalizeHeader(header)];
    return {
      id:             `col_${i}`,
      colIndex:       i,
      originalHeader: header,
      mappedField:    field ?? 'ignore',
      visible:        true,
      confidence:     field ? 'high' : 'none',
    };
  });
}

// Apply a saved template to a set of headers
export function applyTemplate(template: MappingTemplate, headers: string[]): ColumnDef[] {
  return headers.map((header, i) => {
    const fromTemplate = template.mappings[header.toLowerCase()];
    const fromAlias    = COLUMN_ALIASES[normalizeHeader(header)];
    const field        = fromTemplate ?? fromAlias ?? 'ignore';
    return {
      id:             `col_${i}`,
      colIndex:       i,
      originalHeader: header,
      mappedField:    field,
      visible:        true,
      confidence:     fromTemplate ? 'high' : fromAlias ? 'high' : 'none',
    };
  });
}

// ── Core row validator ─────────────────────────────────────────────────────
function validateRow(
  mapped:     Partial<Record<SystemFieldKey, unknown>>,
  rowNum:     number,
  seenCodes:  Map<string, number>,
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
    reorder_qty:     toNum(mapped.reorder_qty,   10),
    base_unit:       toStr(mapped.base_unit),
    barcode:         toStr(mapped.barcode),
  };

  const errors: string[] = [];

  if (!data.item_code) errors.push('Item Code is required');
  if (!data.name)      errors.push('Item Name is required');

  if (data.cost_price > 0 && data.retail_price > 0 && data.retail_price < data.cost_price) {
    errors.push(`Retail (${data.retail_price}) < Cost (${data.cost_price})`);
  }
  if (data.min_price > 0 && data.cost_price > 0 && data.min_price < data.cost_price) {
    errors.push(`Min Price (${data.min_price}) < Cost (${data.cost_price})`);
  }
  if (data.min_price > 0 && data.retail_price > 0 && data.min_price > data.retail_price) {
    errors.push(`Min Price (${data.min_price}) > Retail (${data.retail_price})`);
  }

  const codeKey = data.item_code.toLowerCase();
  let status: RowStatus = errors.length > 0 ? 'error' : 'valid';

  if (data.item_code) {
    if (seenCodes.has(codeKey)) {
      errors.push(`Duplicate code in file (first at row ${seenCodes.get(codeKey)})`);
      status = 'duplicate';
    } else {
      seenCodes.set(codeKey, rowNum);
    }
  }

  return { rowNum, data, status, errors };
}

// ── Apply column mapping to raw data and validate ─────────────────────────
export function applyMappingAndValidate(
  raw:     RawImportData,
  columns: ColumnDef[],
): ImportRow[] {
  // Build colIndex → field map (ignore hidden columns with 'ignore')
  const fieldByCol = new Map<number, SystemFieldKey>();
  columns.forEach(c => {
    if (c.mappedField !== 'ignore') fieldByCol.set(c.colIndex, c.mappedField);
  });

  const seenCodes = new Map<string, number>();
  const result: ImportRow[] = [];

  for (let i = 0; i < raw.rows.length; i++) {
    const cells = raw.rows[i];
    if (!cells || cells.every(c => c.trim() === '')) continue;

    const mapped: Partial<Record<SystemFieldKey, unknown>> = {};
    cells.forEach((val, colIdx) => {
      const field = fieldByCol.get(colIdx);
      if (field !== undefined) mapped[field] = val;
    });

    result.push(validateRow(mapped, i + 1, seenCodes));
  }

  return result;
}

// ── Summary ────────────────────────────────────────────────────────────────
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

// ── Check required field coverage ─────────────────────────────────────────
export interface MappingHealth {
  hasItemCode:   boolean;
  hasName:       boolean;
  mappedCount:   number;
  unmappedCount: number;
  duplicateFields: SystemFieldKey[]; // fields mapped to more than one column
}

export function checkMappingHealth(columns: ColumnDef[]): MappingHealth {
  const active = columns.filter(c => c.mappedField !== 'ignore');
  const fieldCounts = new Map<SystemFieldKey, number>();
  active.forEach(c => {
    fieldCounts.set(c.mappedField as SystemFieldKey, (fieldCounts.get(c.mappedField as SystemFieldKey) ?? 0) + 1);
  });

  return {
    hasItemCode:     fieldCounts.has('item_code'),
    hasName:         fieldCounts.has('name'),
    mappedCount:     active.length,
    unmappedCount:   columns.filter(c => c.mappedField === 'ignore').length,
    duplicateFields: Array.from(fieldCounts.entries())
      .filter(([, n]) => n > 1)
      .map(([f]) => f),
  };
}
