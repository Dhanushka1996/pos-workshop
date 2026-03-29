'use client';

/**
 * Import Items — Multi-step wizard
 *
 * Step 1 (Input):   Two tabs — Upload Excel File  |  Paste from Clipboard
 * Step 2 (Preview): Shared validation table, filter by status, paginated
 * Step 3 (Results): Summary cards + error report download
 *
 * Both input methods call different parse endpoints but produce the same
 * ImportRow[] shape, so steps 2 and 3 are 100% shared.
 */

import {
  useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import {
  Upload, Download, FileSpreadsheet, ClipboardPaste, CheckCircle2,
  XCircle, AlertTriangle, RefreshCw, ArrowLeft, ChevronLeft,
  ChevronRight, Package, Pencil, SkipForward, Filter, ArrowUpCircle,
  Clipboard, FileUp, Info, Zap, Hash, Tag, DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportRow, ImportSummary, ExecuteResult } from '@/lib/import/itemImport';

export const dynamic = 'force-dynamic';

// ── Local types ────────────────────────────────────────────────────────────
type Step    = 'input' | 'preview' | 'results';
type InputTab = 'file' | 'paste';
type Mode    = 'create' | 'upsert';
type RowFilter = 'all' | 'valid' | 'error' | 'exists';

const PAGE_SIZE = 50;

// Canonical column display info — used by both the paste column guide and the help panel
const COLUMN_GUIDE = [
  { field: 'item_code',       label: 'Item Code',       required: true,  icon: Hash        },
  { field: 'name',            label: 'Item Name',        required: true,  icon: Tag         },
  { field: 'category',        label: 'Category',         required: false, icon: Package     },
  { field: 'sub_category',    label: 'Sub Category',     required: false, icon: Package     },
  { field: 'brand',           label: 'Brand',            required: false, icon: Tag         },
  { field: 'supplier',        label: 'Supplier',         required: false, icon: Tag         },
  { field: 'cost_price',      label: 'Cost Price',       required: false, icon: DollarSign  },
  { field: 'retail_price',    label: 'Retail Price',     required: false, icon: DollarSign  },
  { field: 'wholesale_price', label: 'Wholesale Price',  required: false, icon: DollarSign  },
  { field: 'min_price',       label: 'Minimum Price',    required: false, icon: DollarSign  },
  { field: 'reorder_level',   label: 'Reorder Level',    required: false, icon: Zap         },
  { field: 'reorder_qty',     label: 'Reorder Qty',      required: false, icon: Zap         },
  { field: 'base_unit',       label: 'Base Unit',        required: false, icon: Package     },
  { field: 'barcode',         label: 'Barcode',          required: false, icon: Hash        },
] as const;

// ── Client-side paste detection (no server round-trip) ─────────────────────
// Analyses the first row of pasted text and shows which columns were detected.
const PASTE_ALIASES: Record<string, string> = {
  'item code': 'Item Code',       'item_code': 'Item Code',    'code': 'Item Code',
  'sku': 'Item Code',             'part no': 'Item Code',      'part number': 'Item Code',
  'item name': 'Item Name',       'item_name': 'Item Name',    'name': 'Item Name',
  'product name': 'Item Name',    'description': 'Item Name',
  'category': 'Category',         'cat': 'Category',
  'sub category': 'Sub Category', 'subcategory': 'Sub Category', 'sub_category': 'Sub Category',
  'brand': 'Brand',               'make': 'Brand',             'manufacturer': 'Brand',
  'supplier': 'Supplier',         'vendor': 'Supplier',
  'cost price': 'Cost Price',     'cost': 'Cost Price',        'cost_price': 'Cost Price',
  'retail price': 'Retail Price', 'price': 'Retail Price',     'selling price': 'Retail Price',
  'wholesale price': 'Wholesale Price', 'wholesale': 'Wholesale Price',
  'minimum price': 'Min Price',   'min price': 'Min Price',    'min_price': 'Min Price',
  'reorder level': 'Reorder Level', 'reorder_level': 'Reorder Level', 'min stock': 'Reorder Level',
  'reorder qty': 'Reorder Qty',   'reorder quantity': 'Reorder Qty', 'reorder_qty': 'Reorder Qty',
  'base unit': 'Base Unit',       'unit': 'Base Unit',         'uom': 'Base Unit',
  'barcode': 'Barcode',           'ean': 'Barcode',            'upc': 'Barcode',
};

interface PasteDetection {
  rowCount:    number;
  colCount:    number;
  hasHeaders:  boolean;
  matched:     string[];   // friendly column names that were detected
  unmatched:   string[];   // raw header strings that couldn't be mapped
  missingReq:  string[];   // required fields not found (only when headers detected)
}

function detectPaste(text: string): PasteDetection | null {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return null;

  const firstCells = lines[0].split('\t').map(c => c.trim());
  const norm       = (s: string) => s.toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();

  const matched:   string[] = [];
  const unmatched: string[] = [];
  for (const cell of firstCells) {
    const label = PASTE_ALIASES[norm(cell)];
    if (label) matched.push(label);
    else if (cell) unmatched.push(cell);
  }

  const hasHeaders = matched.length >= 1;
  const dataRows   = hasHeaders ? lines.length - 1 : lines.length;

  const missingReq = hasHeaders
    ? ['Item Code', 'Item Name'].filter(req => !matched.includes(req))
    : [];

  return {
    rowCount:   dataRows,
    colCount:   firstCells.filter(c => c).length,
    hasHeaders,
    matched,
    unmatched,
    missingReq,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function ImportPage() {
  const [step,        setStep]        = useState<Step>('input');
  const [inputTab,    setInputTab]    = useState<InputTab>('file');
  const [mode,        setMode]        = useState<Mode>('create');
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [summary,     setSummary]     = useState<ImportSummary | null>(null);
  const [result,      setResult]      = useState<ExecuteResult | null>(null);
  const [importing,   setImporting]   = useState(false);
  const [importError, setImportError] = useState('');

  const handlePreviewReady = useCallback((rows: ImportRow[], s: ImportSummary) => {
    setPreviewRows(rows);
    setSummary(s);
    setStep('preview');
  }, []);

  const handleImport = async () => {
    setImporting(true);
    setImportError('');
    try {
      const res  = await fetch('/api/import/items/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode, rows: previewRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      setResult(data as ExecuteResult);
      setStep('results');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setPreviewRows([]);
    setSummary(null);
    setResult(null);
    setImportError('');
  };

  const errorCount = useMemo(
    () => previewRows.filter(r => r.status === 'error' || r.status === 'duplicate').length,
    [previewRows],
  );

  const stepLabels: Step[] = ['input', 'preview', 'results'];

  return (
    <div className="flex flex-col h-full bg-zinc-950">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        {step !== 'input' && (
          <button
            onClick={() => step === 'preview' ? setStep('input') : handleReset()}
            className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <FileSpreadsheet className="size-4 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">Import Items</h1>
            <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
              {step === 'input'   && 'Upload an Excel file or paste data directly from your spreadsheet'}
              {step === 'preview' && `${previewRows.length.toLocaleString()} rows loaded — review then import`}
              {step === 'results' && 'Import complete — review your results below'}
            </p>
          </div>
        </div>

        {/* Step pills */}
        <div className="ml-auto flex items-center gap-1">
          {stepLabels.map((s, i) => {
            const done    = stepLabels.indexOf(step) > i;
            const active  = step === s;
            const label   = s === 'input' ? 'Upload' : s.charAt(0).toUpperCase() + s.slice(1);
            return (
              <div key={s} className="flex items-center gap-1">
                <div className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all',
                  active ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : done  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-white/[0.03] border-white/[0.07] text-zinc-600',
                )}>
                  <span className={cn(
                    'size-4 rounded-full flex items-center justify-center text-[9px] font-bold',
                    active ? 'bg-indigo-500 text-white'
                    : done  ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-zinc-500',
                  )}>
                    {done ? '✓' : i + 1}
                  </span>
                  {label}
                </div>
                {i < stepLabels.length - 1 && (
                  <div className="w-4 h-px bg-white/[0.06]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {step === 'input' && (
          <InputStep
            tab={inputTab}
            setTab={setInputTab}
            mode={mode}
            setMode={setMode}
            onReady={handlePreviewReady}
          />
        )}
        {step === 'preview' && (
          <PreviewStep
            rows={previewRows}
            summary={summary!}
            mode={mode}
            errorCount={errorCount}
            importing={importing}
            importError={importError}
            onImport={handleImport}
          />
        )}
        {step === 'results' && (
          <ResultsStep result={result!} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STEP 1 — INPUT  (tabbed: Upload File | Paste Data)
// ══════════════════════════════════════════════════════════════════════════
function InputStep({
  tab, setTab, mode, setMode, onReady,
}: {
  tab:     InputTab;
  setTab:  (t: InputTab) => void;
  mode:    Mode;
  setMode: (m: Mode) => void;
  onReady: (rows: ImportRow[], s: ImportSummary) => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      {/* ── Import Mode ─────────────────────────────────────────── */}
      <section>
        <SectionLabel>Import Mode</SectionLabel>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {[
            {
              value: 'create' as Mode,
              label: 'Create Only',
              desc:  'Inserts new items. Existing Item Codes are skipped.',
              icon:  Package,
              accent: 'indigo',
            },
            {
              value: 'upsert' as Mode,
              label: 'Update Existing',
              desc:  'Inserts new + updates matching items by Item Code.',
              icon:  Pencil,
              accent: 'amber',
            },
          ].map(opt => {
            const Icon = opt.icon;
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150',
                  active
                    ? opt.accent === 'indigo'
                      ? 'border-indigo-500/40 bg-indigo-500/10 ring-1 ring-indigo-500/20'
                      : 'border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20'
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
                )}
              >
                <div className={cn(
                  'size-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  active
                    ? opt.accent === 'indigo' ? 'bg-indigo-500/20' : 'bg-amber-500/20'
                    : 'bg-white/[0.05]',
                )}>
                  <Icon className={cn(
                    'size-4',
                    active
                      ? opt.accent === 'indigo' ? 'text-indigo-400' : 'text-amber-400'
                      : 'text-zinc-500',
                  )} />
                </div>
                <div className="min-w-0">
                  <p className={cn(
                    'text-sm font-semibold leading-tight',
                    active ? 'text-white' : 'text-zinc-400',
                  )}>{opt.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
                <div className={cn(
                  'ml-auto size-4 rounded-full border-2 flex-shrink-0 mt-1',
                  active
                    ? opt.accent === 'indigo' ? 'border-indigo-400 bg-indigo-400' : 'border-amber-400 bg-amber-400'
                    : 'border-zinc-700',
                )}>
                  {active && <div className="size-full rounded-full bg-white scale-50" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Input Method Tabs ────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.07] w-fit mb-5">
          {([
            { value: 'file' as InputTab, label: 'Upload Excel File', Icon: FileUp          },
            { value: 'paste' as InputTab, label: 'Paste from Clipboard', Icon: ClipboardPaste },
          ]).map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                tab === value
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'file'  && <UploadFileTab  onReady={onReady} />}
        {tab === 'paste' && <PasteDataTab   onReady={onReady} />}
      </section>
    </div>
  );
}

// ── Upload File Tab ────────────────────────────────────────────────────────
function UploadFileTab({ onReady }: { onReady: (rows: ImportRow[], s: ImportSummary) => void }) {
  const [dragging,   setDragging]   = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error,      setError]      = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError('');
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/import/items/preview', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Processing failed');
      onReady(data.rows, data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setProcessing(false);
    }
  }, [onReady]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="space-y-4">
      {/* Template download */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="size-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">Don&apos;t have a template?</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Download our pre-formatted Excel template with sample data and column instructions.
            </p>
          </div>
        </div>
        <a
          href="/api/import/items/template"
          download
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium transition-all whitespace-nowrap ml-4"
        >
          <Download className="size-4" />
          Download Template
        </a>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={handleDrop}
        onClick={() => !processing && fileRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed p-14 cursor-pointer select-none transition-all duration-200',
          dragging
            ? 'border-indigo-500/70 bg-indigo-500/5 scale-[1.01]'
            : processing
            ? 'border-white/10 bg-white/[0.02] pointer-events-none'
            : 'border-white/10 hover:border-white/25 hover:bg-white/[0.025]',
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
        />

        {processing ? (
          <>
            <div className="relative">
              <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <RefreshCw className="size-7 text-indigo-400 animate-spin" />
              </div>
              <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-zinc-900 flex items-center justify-center">
                <div className="size-3 rounded-full bg-indigo-500 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Processing file…</p>
              <p className="text-sm text-zinc-500 mt-1">Parsing rows and running validation checks</p>
            </div>
          </>
        ) : (
          <>
            <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Upload className="size-7 text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">
                {dragging ? 'Release to upload' : 'Drag & drop your file here'}
              </p>
              <p className="text-sm text-zinc-400 mt-1.5">
                or{' '}
                <span className="text-indigo-400 underline underline-offset-2 cursor-pointer">
                  click to browse
                </span>
              </p>
              <p className="text-xs text-zinc-600 mt-3 flex items-center justify-center gap-1.5">
                <FileSpreadsheet className="size-3.5" />
                .xlsx · .xls · .xlsm &nbsp;·&nbsp; Max 10 MB &nbsp;·&nbsp; Up to 5,000 rows
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <ErrorBanner title="Upload Failed" message={error} onDismiss={() => setError('')} />
      )}
    </div>
  );
}

// ── Paste Data Tab ─────────────────────────────────────────────────────────
function PasteDataTab({ onReady }: { onReady: (rows: ImportRow[], s: ImportSummary) => void }) {
  const [text,       setText]       = useState('');
  const [detection,  setDetection]  = useState<PasteDetection | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error,      setError]      = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Re-analyse whenever text changes
  useEffect(() => {
    if (!text.trim()) { setDetection(null); return; }
    setDetection(detectPaste(text));
  }, [text]);

  const handleParse = async () => {
    if (!text.trim()) return;
    setError('');
    setProcessing(true);
    try {
      const res  = await fetch('/api/import/items/preview-text', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Parse failed');
      onReady(data.rows, data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse data');
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = () => { setText(''); setDetection(null); setError(''); };

  const lineCount = text.trim() ? text.trim().split(/\r?\n/).length : 0;
  const canParse  = text.trim().length > 0 && (detection?.missingReq.length ?? 0) === 0;

  return (
    <div className="space-y-4">

      {/* How-to hint */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-500/5 border border-sky-500/20">
        <Clipboard className="size-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-400 space-y-0.5">
          <p className="font-semibold text-sky-300">How to paste from Excel</p>
          <p>1. Open your Excel sheet &nbsp;→&nbsp; select your rows (include the header row)</p>
          <p>2. Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Ctrl+C</kbd> to copy</p>
          <p>3. Click inside the text box below &nbsp;→&nbsp; press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Ctrl+V</kbd> to paste</p>
          <p className="text-zinc-500">Column headers are auto-detected. Partial column sets are fine — missing columns use defaults.</p>
        </div>
      </div>

      {/* Column reference */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-xs text-zinc-500 hover:text-zinc-300 transition-colors select-none list-none">
          <Info className="size-3.5" />
          <span>Supported column names</span>
          <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.07]">
          {COLUMN_GUIDE.map(col => (
            <span key={col.field} className={cn(
              'text-[11px] font-medium px-2 py-0.5 rounded-full border',
              col.required
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                : 'bg-white/[0.04] border-white/10 text-zinc-400',
            )}>
              {col.required && '* '}
              {col.label}
            </span>
          ))}
          <span className="text-[10px] text-zinc-600 self-center ml-1">* required</span>
        </div>
      </details>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Paste your Excel data here (Ctrl+V)…\n\nExample:\nItem Code\tItem Name\tCategory\tCost Price\tRetail Price\nBRK-001\tBrake Pad Front\tBrakes\t1500\t2200\nOIL-001\tEngine Oil 5W-30\tLubricants\t800\t1200`}
          className={cn(
            'w-full min-h-[260px] resize-y rounded-xl border bg-zinc-900/80 text-zinc-200 font-mono text-[13px] leading-relaxed p-4 placeholder:text-zinc-700 focus:outline-none transition-all',
            text
              ? 'border-white/20 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10'
              : 'border-white/10 focus:border-white/25',
          )}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
        {text && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[10px] text-zinc-600 pointer-events-none">
            <span className="bg-zinc-900/90 px-2 py-0.5 rounded">
              {lineCount.toLocaleString()} line{lineCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Column detection panel */}
      {detection && (
        <DetectionPanel detection={detection} />
      )}

      {error && (
        <ErrorBanner title="Parse Failed" message={error} onDismiss={() => setError('')} />
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleParse}
          disabled={!canParse || processing}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all',
            canParse && !processing
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-white/[0.05] text-zinc-600 cursor-not-allowed',
          )}
        >
          {processing
            ? <><RefreshCw className="size-4 animate-spin" />Parsing…</>
            : <><Zap className="size-4" />Parse & Preview</>
          }
        </button>
        {text && (
          <button
            onClick={handleClear}
            className="px-4 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all"
          >
            Clear
          </button>
        )}

        {/* Hint when required fields missing */}
        {detection && detection.missingReq.length > 0 && (
          <span className="text-xs text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" />
            Missing required: {detection.missingReq.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Column detection panel ─────────────────────────────────────────────────
function DetectionPanel({ detection }: { detection: PasteDetection }) {
  const { rowCount, colCount, hasHeaders, matched, unmatched, missingReq } = detection;
  const hasIssues = missingReq.length > 0;

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3 transition-all',
      hasIssues
        ? 'border-amber-500/25 bg-amber-500/5'
        : 'border-emerald-500/20 bg-emerald-500/5',
    )}>
      {/* Stats row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-zinc-300">
          {hasIssues
            ? <AlertTriangle className="size-3.5 text-amber-400" />
            : <CheckCircle2 className="size-3.5 text-emerald-400" />
          }
          <span className="font-semibold text-white tabular-nums">{rowCount.toLocaleString()}</span> data row{rowCount !== 1 ? 's' : ''} detected
        </div>
        <div className="text-xs text-zinc-500">
          {colCount} column{colCount !== 1 ? 's' : ''} · {matched.length} mapped
        </div>
        {!hasHeaders && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <Info className="size-3" />
            No header row found — using positional mapping
          </span>
        )}
      </div>

      {/* Matched columns */}
      {matched.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Detected columns
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matched.map(label => {
              const isReq = label === 'Item Code' || label === 'Item Name';
              return (
                <span key={label} className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border',
                  isReq
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-sky-500/10 border-sky-500/20 text-sky-300',
                )}>
                  <CheckCircle2 className="size-2.5" />
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Missing required */}
      {missingReq.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="size-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            <span className="font-semibold">Required columns not found:</span>{' '}
            {missingReq.join(', ')} — make sure your first row contains these column headers.
          </p>
        </div>
      )}

      {/* Unrecognised columns */}
      {unmatched.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Unrecognised ({unmatched.length} — will be ignored)
          </p>
          <div className="flex flex-wrap gap-1">
            {unmatched.slice(0, 10).map(h => (
              <span key={h} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-500">
                {h}
              </span>
            ))}
            {unmatched.length > 10 && (
              <span className="text-[11px] text-zinc-600 self-center">+{unmatched.length - 10} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STEP 2 — PREVIEW TABLE
// ══════════════════════════════════════════════════════════════════════════
function PreviewStep({
  rows, summary, mode, errorCount, importing, importError, onImport,
}: {
  rows:        ImportRow[];
  summary:     ImportSummary;
  mode:        Mode;
  errorCount:  number;
  importing:   boolean;
  importError: string;
  onImport:    () => void;
}) {
  const [filter, setFilter] = useState<RowFilter>('all');
  const [page,   setPage]   = useState(1);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'valid':  return rows.filter(r => r.status === 'valid');
      case 'exists': return rows.filter(r => r.status === 'exists');
      case 'error':  return rows.filter(r => r.status === 'error' || r.status === 'duplicate');
      default:       return rows;
    }
  }, [rows, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const willImport = mode === 'create'
    ? summary.valid
    : summary.valid + summary.existing;
  const willSkip   = mode === 'create' ? summary.existing : 0;

  // Reset to page 1 whenever filter changes
  useEffect(() => setPage(1), [filter]);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 73px)' }}>

      {/* Summary bar */}
      <div className="px-6 py-3 border-b border-white/[0.06] bg-zinc-900/40 flex items-center gap-3 flex-wrap">
        {[
          { label: 'Total',    count: summary.total,                             color: 'zinc'    },
          { label: 'Valid',    count: summary.valid,                             color: 'emerald' },
          { label: 'Existing', count: summary.existing,                          color: 'sky'     },
          { label: 'Errors',   count: summary.errors + summary.duplicates,       color: 'red'     },
        ].map(p => (
          <SummaryPill key={p.label} {...p} />
        ))}
        <div className="ml-auto">
          {errorCount === 0 ? (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Ready — {willImport.toLocaleString()} items will be imported
              {willSkip > 0 && `, ${willSkip.toLocaleString()} skipped`}
            </span>
          ) : (
            <span className="text-xs text-red-400 font-medium flex items-center gap-1.5">
              <XCircle className="size-3.5" />
              Fix {errorCount} error{errorCount !== 1 ? 's' : ''} before importing
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-6 py-1.5 border-b border-white/[0.06] flex items-center gap-1">
        <Filter className="size-3.5 text-zinc-700 mr-0.5 flex-shrink-0" />
        {([
          { value: 'all'    as RowFilter, label: 'All',      count: rows.length                            },
          { value: 'valid'  as RowFilter, label: 'Valid',    count: summary.valid                          },
          { value: 'exists' as RowFilter, label: 'Existing', count: summary.existing                       },
          { value: 'error'  as RowFilter, label: 'Errors',   count: summary.errors + summary.duplicates    },
        ]).map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              filter === f.value ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]',
            )}
          >
            {f.label}
            <span className={cn(
              'px-1.5 py-px rounded text-[10px] font-bold',
              filter === f.value ? 'bg-white/10' : 'bg-white/[0.06]',
            )}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-zinc-900/95 backdrop-blur border-b border-white/[0.06]">
              {['Row', 'Status', 'Item Code', 'Item Name', 'Category', 'Brand', 'Cost', 'Retail', 'Issues / Info'].map(h => (
                <th
                  key={h}
                  className={cn(
                    'px-3 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider',
                    ['Cost', 'Retail'].includes(h) ? 'text-right' : 'text-left',
                    h === 'Row' && 'w-12',
                    h === 'Status' && 'w-24',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.035]">
            {pageRows.map(row => (
              <PreviewRow key={`r-${row.rowNum}`} row={row} mode={mode} />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Package className="size-10 text-zinc-800 mb-3" />
            <p className="text-sm">No rows match this filter</p>
          </div>
        )}
      </div>

      {/* Pagination + Import footer */}
      <div className="px-6 py-3 border-t border-white/[0.06] bg-zinc-900/60 backdrop-blur flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs text-zinc-500 tabular-nums min-w-[120px] text-center">
            {filtered.length === 0
              ? 'No rows'
              : `${((page - 1) * PAGE_SIZE + 1).toLocaleString()}–${Math.min(page * PAGE_SIZE, filtered.length).toLocaleString()} of ${filtered.length.toLocaleString()}`}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {importError && (
            <span className="text-xs text-red-400 flex items-center gap-1.5">
              <XCircle className="size-3.5" />{importError}
            </span>
          )}
          <button
            onClick={onImport}
            disabled={errorCount > 0 || importing || willImport === 0}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all',
              errorCount === 0 && willImport > 0
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60'
                : 'bg-white/[0.05] text-zinc-500 cursor-not-allowed',
            )}
          >
            {importing
              ? <><RefreshCw className="size-4 animate-spin" />Importing…</>
              : <><ArrowUpCircle className="size-4" />Import {willImport.toLocaleString()} Items</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single preview table row ───────────────────────────────────────────────
function PreviewRow({ row, mode }: { row: ImportRow; mode: Mode }) {
  const isErr    = row.status === 'error' || row.status === 'duplicate';
  const isExists = row.status === 'exists';
  const willSkip = isExists && mode === 'create';

  return (
    <tr className={cn(
      'transition-colors group',
      isErr    ? 'bg-red-500/[0.035] hover:bg-red-500/[0.06]'
      : willSkip ? 'opacity-45 hover:opacity-60'
      : isExists  ? 'bg-sky-500/[0.025] hover:bg-sky-500/[0.05]'
      : 'hover:bg-white/[0.02]',
    )}>
      <td className="px-3 py-2.5 text-xs text-zinc-600 tabular-nums">{row.rowNum}</td>
      <td className="px-3 py-2.5">
        <StatusBadge status={row.status} mode={mode} />
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-zinc-200 whitespace-nowrap">
        {row.data.item_code || <span className="text-red-500 italic">missing</span>}
      </td>
      <td className="px-3 py-2.5 text-xs text-white max-w-[180px]">
        <span className="block truncate">
          {row.data.name || <span className="text-red-500 italic">missing</span>}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-zinc-500 max-w-[120px]">
        <span className="block truncate">{row.data.category || '—'}</span>
      </td>
      <td className="px-3 py-2.5 text-xs text-zinc-500 max-w-[110px]">
        <span className="block truncate">{row.data.brand || '—'}</span>
      </td>
      <td className="px-3 py-2.5 text-right text-xs text-zinc-300 tabular-nums">
        {row.data.cost_price > 0 ? row.data.cost_price.toLocaleString() : '—'}
      </td>
      <td className="px-3 py-2.5 text-right text-xs text-zinc-300 tabular-nums">
        {row.data.retail_price > 0 ? row.data.retail_price.toLocaleString() : '—'}
      </td>
      <td className="px-3 py-2.5">
        {isErr ? (
          <ul className="space-y-0.5">
            {row.errors.map((e, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-red-400 leading-snug">
                <span className="size-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                {e}
              </li>
            ))}
          </ul>
        ) : isExists ? (
          <span className="text-[11px] text-sky-400/80">
            {mode === 'upsert'
              ? `↻ Will update "${row.existingName ?? row.data.item_code}"`
              : '⊘ Already exists — will be skipped'}
          </span>
        ) : (
          <span className="text-[11px] text-zinc-700">New item — will be created</span>
        )}
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STEP 3 — RESULTS
// ══════════════════════════════════════════════════════════════════════════
function ResultsStep({ result, onReset }: { result: ExecuteResult; onReset: () => void }) {
  const totalDone = result.created + result.updated;
  const hasErrors = result.errors.length > 0;
  const allFailed = totalDone === 0 && hasErrors;

  const downloadErrors = async () => {
    const XLSX = (await import('xlsx')).default;
    const headers = ['Row #', 'Item Code', 'Error Message'];
    const rows    = result.errors.map(e => [e.rowNum, e.item_code, e.error]);
    const ws      = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols']   = [{ wch: 8 }, { wch: 20 }, { wch: 80 }];
    const wb      = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');
    XLSX.writeFile(wb, `import-errors-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

      {/* Banner */}
      <div className={cn(
        'flex items-start gap-4 p-6 rounded-2xl border',
        allFailed
          ? 'border-red-500/30 bg-red-500/5'
          : hasErrors
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-emerald-500/30 bg-emerald-500/5',
      )}>
        {totalDone > 0
          ? <CheckCircle2 className="size-9 text-emerald-400 flex-shrink-0" />
          : <XCircle      className="size-9 text-red-400     flex-shrink-0" />
        }
        <div>
          <p className={cn(
            'text-xl font-bold',
            totalDone > 0 ? 'text-emerald-400' : 'text-red-400',
          )}>
            {allFailed ? 'Import Failed' : 'Import Complete'}
          </p>
          <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
            {result.created > 0 && <>{result.created} item{result.created !== 1 ? 's' : ''} created. </>}
            {result.updated > 0 && <>{result.updated} item{result.updated !== 1 ? 's' : ''} updated. </>}
            {result.skipped > 0 && <>{result.skipped} skipped (already exist). </>}
            {result.failed  > 0 && <span className="text-red-400">{result.failed} failed.</span>}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Created',  value: result.created, color: 'emerald' },
          { label: 'Updated',  value: result.updated, color: 'sky'     },
          { label: 'Skipped',  value: result.skipped, color: 'zinc'    },
          { label: 'Failed',   value: result.failed,  color: 'red'     },
        ].map(c => (
          <div key={c.label} className={cn(
            'rounded-xl border p-4 text-center',
            c.color === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/5'
            : c.color === 'sky'   ? 'border-sky-500/20 bg-sky-500/5'
            : c.color === 'red'   ? 'border-red-500/20 bg-red-500/5'
            : 'border-white/[0.07] bg-white/[0.02]',
          )}>
            <p className={cn(
              'text-3xl font-bold tabular-nums',
              c.color === 'emerald' ? 'text-emerald-400'
              : c.color === 'sky'   ? 'text-sky-400'
              : c.color === 'red'   ? 'text-red-400'
              : 'text-zinc-500',
            )}>{c.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Error list */}
      {hasErrors && (
        <div className="rounded-xl border border-red-500/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-red-500/5 border-b border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-400" />
              <span className="text-sm font-semibold text-red-300">
                {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed to import
              </span>
            </div>
            <button
              onClick={downloadErrors}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs text-red-400 font-medium transition-all"
            >
              <Download className="size-3.5" />
              Download Error Report
            </button>
          </div>
          <div className="divide-y divide-red-500/10 max-h-64 overflow-y-auto">
            {result.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-[11px] text-zinc-600 tabular-nums w-14 flex-shrink-0">
                  Row {e.rowNum}
                </span>
                <span className="text-[11px] font-mono text-zinc-400 w-24 flex-shrink-0">
                  {e.item_code || '—'}
                </span>
                <span className="text-[11px] text-red-400 leading-relaxed">{e.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
        >
          <Upload className="size-4" />
          Import Another File
        </button>
        <a
          href="/inventory/items"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-zinc-300 text-sm font-medium transition-all"
        >
          <Package className="size-4" />
          View Item Master
        </a>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════════
function StatusBadge({ status, mode }: { status: ImportRow['status']; mode: Mode }) {
  if (status === 'error') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 whitespace-nowrap">
      <XCircle className="size-2.5" /> Error
    </span>
  );
  if (status === 'duplicate') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 whitespace-nowrap">
      <XCircle className="size-2.5" /> Duplicate
    </span>
  );
  if (status === 'exists') return mode === 'upsert' ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 whitespace-nowrap">
      <RefreshCw className="size-2.5" /> Update
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-600/30 text-zinc-500 whitespace-nowrap">
      <SkipForward className="size-2.5" /> Skip
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 whitespace-nowrap">
      <CheckCircle2 className="size-2.5" /> Valid
    </span>
  );
}

function SummaryPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium',
      color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
      : color === 'sky'   ? 'bg-sky-500/5 border-sky-500/20 text-sky-400'
      : color === 'red'   ? 'bg-red-500/5 border-red-500/20 text-red-400'
      : color === 'amber' ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
      : 'bg-white/[0.04] border-white/10 text-zinc-400',
    )}>
      <span className="font-bold tabular-nums text-sm">{count.toLocaleString()}</span>
      {label}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">
      {children}
    </p>
  );
}

function ErrorBanner({ title, message, onDismiss }: { title: string; message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
      <XCircle className="size-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-400">{title}</p>
        <p className="text-xs text-red-400/70 mt-0.5 break-words">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-zinc-600 hover:text-zinc-400 flex-shrink-0">
        <XCircle className="size-4" />
      </button>
    </div>
  );
}
