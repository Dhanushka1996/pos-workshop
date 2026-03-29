'use client';

import {
  useState, useEffect, useRef, useCallback,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Scissors, Plus, Trash2, Package, Search,
  RefreshCw, AlertCircle, Hash, ArrowDownCircle,
  ArrowUpCircle, X, ChevronDown, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useCreateDisassembly } from '@/hooks/inventory/useDisassembly';

export const dynamic = 'force-dynamic';


// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductOption {
  id:                   string;
  item_code:            string;
  name:                 string;
  cost_price:           number;
  retail_price:         number;
  current_stock:        number;
  brand?:               { name: string } | null;
  vehicle_compatibility?: string | null;
  product_type?:        string;
}

type Condition = 'good' | 'damaged' | 'scrap';

interface ComponentRow {
  key:       string;
  product:   ProductOption | null;
  qty:       number;
  unit_cost: number;
  condition: Condition;
  recovered: boolean;
  notes:     string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const esc   = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${esc})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-rose-400/20 text-rose-300 rounded-sm not-italic">{p}</mark>
          : <span key={i}>{p}</span>,
      )}
    </>
  );
}

const CONDITION_CONFIG: Record<Condition, { label: string; color: string }> = {
  good:    { label: 'Good',    color: 'emerald' },
  damaged: { label: 'Damaged', color: 'amber'   },
  scrap:   { label: 'Scrap',   color: 'red'     },
};

// ─── Product Search Dropdown ─────────────────────────────────────────────────

function ProductSearch({
  placeholder,
  excludeIds = [],
  onSelect,
  accentColor = 'rose',
}: {
  placeholder?: string;
  excludeIds?: string[];
  onSelect: (p: ProductOption) => void;
  accentColor?: 'rose' | 'amber';
}) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<ProductOption[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [open,      setOpen]      = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/inventory/products?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      const all  = (data.products ?? data ?? []) as ProductOption[];
      setResults(all.filter(p => !excludeIds.includes(p.id)));
      setOpen(true);
      setActiveIdx(-1);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [excludeIds]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 220);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    (listRef.current.querySelectorAll('[data-item]')[activeIdx] as HTMLElement)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const select = (p: ProductOption) => {
    onSelect(p);
    setQuery('');
    setResults([]);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(results[activeIdx]); }
    if (e.key === 'Escape') setOpen(false);
  };

  const borderFocus = accentColor === 'rose' ? 'focus-within:border-rose-500/40' : 'focus-within:border-amber-500/40';
  const activeBg    = accentColor === 'rose' ? 'bg-rose-500/10' : 'bg-amber-500/10';
  const activeIcon  = accentColor === 'rose' ? 'text-rose-400'  : 'text-amber-400';

  return (
    <div ref={ref} className="relative">
      <div className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors',
        open
          ? `bg-white/[0.05] ${accentColor === 'rose' ? 'border-rose-500/40' : 'border-amber-500/40'}`
          : `bg-white/[0.03] border-white/[0.08] ${borderFocus}`,
      )}>
        <Search className="size-3.5 text-zinc-500 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); if (!open && e.target.value) setOpen(true); }}
          onFocus={() => { if (results.length) setOpen(true); }}
          onKeyDown={handleKey}
          placeholder={placeholder ?? 'Search by name, item code, or brand…'}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
        />
        {loading && <RefreshCw className="size-3.5 text-zinc-500 animate-spin flex-shrink-0" />}
      </div>

      {open && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1.5 z-[100] bg-zinc-900 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
            {results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                data-item
                onClick={() => select(p)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 transition-colors text-left',
                  i === activeIdx ? activeBg : 'hover:bg-white/[0.04]',
                )}
              >
                <div className={cn(
                  'size-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  i === activeIdx ? (accentColor === 'rose' ? 'bg-rose-500/20' : 'bg-amber-500/20') : 'bg-white/[0.05]',
                )}>
                  <Package className={cn('size-4', i === activeIdx ? activeIcon : 'text-zinc-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] text-zinc-500 bg-white/[0.05] px-1.5 py-0.5 rounded">
                      <Highlight text={p.item_code} query={query} />
                    </span>
                    {p.brand && <span className="text-[11px] text-zinc-600">{p.brand.name}</span>}
                    {p.product_type === 'ASSEMBLY' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        ASSEMBLY
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white leading-snug">
                    <Highlight text={p.name} query={query} />
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {p.vehicle_compatibility && (
                      <span className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                        <Highlight text={p.vehicle_compatibility} query={query} />
                      </span>
                    )}
                    <span className={cn(
                      'text-[11px] ml-auto flex-shrink-0',
                      p.current_stock <= 0 ? 'text-red-400' : 'text-zinc-500',
                    )}>
                      Stock: {p.current_stock}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-white/[0.06] bg-white/[0.02]">
            <p className="text-[10px] text-zinc-600">
              {results.length} result{results.length !== 1 ? 's' : ''} · ↑↓ navigate · Enter select · Esc close
            </p>
          </div>
        </div>
      )}

      {open && query.trim() && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[100] bg-zinc-900 border border-white/[0.1] rounded-xl shadow-2xl px-4 py-4 text-center">
          <p className="text-sm text-zinc-500">
            No products found for "<span className="text-zinc-300">{query}</span>"
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewDisassemblyPage() {
  const router  = useRouter();
  const { fmt } = useCurrency();
  const create  = useCreateDisassembly();

  const [previewRef, setPreviewRef] = useState('DSM-000001');

  // Parent product state
  const [parent,    setParent]    = useState<ProductOption | null>(null);
  const [qty,       setQty]       = useState('1');
  const [unitCost,  setUnitCost]  = useState('');
  const [notes,     setNotes]     = useState('');

  // Component rows
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [error,      setError]      = useState('');

  // Fetch preview ref
  useEffect(() => {
    fetch('/api/disassembly/next-ref')
      .then(r => r.json())
      .then(d => { if (d.ref_number) setPreviewRef(d.ref_number); })
      .catch(() => {});
  }, []);

  // ── Component management ─────────────────────────────────────────────────

  const addComponent = (product: ProductOption) => {
    // Prevent duplicates
    if (components.some(c => c.product?.id === product.id)) return;
    setComponents(prev => [...prev, {
      key:       crypto.randomUUID(),
      product,
      qty:       1,
      unit_cost: 0,
      condition: 'good',
      recovered: true,
      notes:     '',
    }]);
  };

  const updateComp = <K extends keyof ComponentRow>(key: string, field: K, val: ComponentRow[K]) => {
    setComponents(prev => prev.map(r => r.key === key ? { ...r, [field]: val } : r));
  };

  const removeComp = (key: string) => {
    setComponents(prev => prev.filter(r => r.key !== key));
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const qtyNum        = parseFloat(qty) || 0;
  const unitCostNum   = parseFloat(unitCost) || 0;
  const excludedIds   = [
    ...(parent ? [parent.id] : []),
    ...components.map(c => c.product?.id).filter(Boolean) as string[],
  ];
  const recoveredRows = components.filter(c => c.recovered && c.product);
  const skippedRows   = components.filter(c => !c.recovered && c.product);
  const stockOk       = !parent || !parent.current_stock || parent.current_stock >= qtyNum;

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError('');

    if (!parent)               { setError('Select the item to disassemble'); return; }
    if (qtyNum <= 0)           { setError('Quantity must be greater than 0'); return; }
    if (!stockOk)              { setError(`Insufficient stock. Available: ${parent.current_stock}`); return; }
    if (components.length < 1) { setError('Add at least one component'); return; }

    const validComps = components.filter(c => c.product);
    if (!validComps.length)    { setError('Add at least one component with a product selected'); return; }

    try {
      const result = await create.mutateAsync({
        product_id: parent.id,
        quantity:   qtyNum,
        unit_cost:  unitCostNum,
        notes:      notes || undefined,
        components: validComps.map(c => ({
          product_id: c.product!.id,
          qty:        c.qty,
          unit_cost:  c.unit_cost,
          condition:  c.condition,
          recovered:  c.recovered,
          notes:      c.notes || undefined,
        })),
      });
      router.push(`/inventory/disassembly/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create disassembly record');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06]">
        <button
          onClick={() => router.back()}
          className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="size-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <Scissors className="size-4 text-rose-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">New Disassembly</h1>
            <p className="text-xs text-zinc-500">Break an item into components and recover parts to inventory</p>
          </div>
        </div>
        {/* Reference badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
          <Hash className="size-3.5 text-rose-400" />
          <span className="text-sm font-mono font-bold text-rose-300">{previewRef}</span>
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Auto-assigned</span>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-[1fr_300px] gap-6">

            {/* ── Left column ──────────────────────────────────────────────── */}
            <div className="space-y-5">

              {/* Parent Item */}
              <Card title="Item to Disassemble" subtitle="Select the product and quantity to disassemble">
                {parent ? (
                  <div className="space-y-3">
                    {/* Selected product pill */}
                    <div className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border transition-colors',
                      !stockOk
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-rose-500/5 border-rose-500/20',
                    )}>
                      <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                        <Package className="size-4 text-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-tight">{parent.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {parent.item_code}
                          {parent.brand && ` · ${parent.brand.name}`}
                          {' · '}
                          <span className={parent.current_stock <= 0 ? 'text-red-400' : 'text-zinc-400'}>
                            Stock: {parent.current_stock}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => { setParent(null); setComponents([]); }}
                        className="size-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>

                    {/* Stock warning */}
                    {!stockOk && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20">
                        <AlertCircle className="size-4 text-red-400 flex-shrink-0" />
                        <p className="text-xs text-red-400">
                          Requested quantity ({qtyNum}) exceeds available stock ({parent.current_stock})
                        </p>
                      </div>
                    )}

                    {/* Qty + Cost row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label required>Quantity to Disassemble</Label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={qty}
                          onChange={e => setQty(e.target.value)}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg border text-sm text-white bg-white/[0.04] outline-none transition-colors',
                            !stockOk
                              ? 'border-red-500/40 focus:border-red-500'
                              : 'border-white/10 focus:border-rose-500/50',
                          )}
                        />
                      </div>
                      <div>
                        <Label>Unit Cost (optional)</Label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={unitCost}
                          onChange={e => setUnitCost(e.target.value)}
                          placeholder={String(parent.cost_price || '0.00')}
                          className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white placeholder:text-zinc-600 outline-none focus:border-rose-500/50 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <ProductSearch
                    placeholder="Search item to disassemble…"
                    excludeIds={excludedIds}
                    onSelect={p => {
                      setParent(p);
                      if (!unitCost) setUnitCost(String(p.cost_price || ''));
                    }}
                    accentColor="rose"
                  />
                )}
              </Card>

              {/* Notes */}
              <Card title="Notes" subtitle="Optional context for this disassembly event">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g., Condition, source vehicle, reason for disassembly…"
                  className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white placeholder:text-zinc-600 outline-none focus:border-rose-500/50 resize-none transition-colors"
                />
              </Card>

              {/* Components Section */}
              <Card
                title="Components"
                subtitle="Parts extracted — toggle recovery to control what enters inventory"
              >
                {/* Component rows */}
                {components.length > 0 && (
                  <div className="mb-4 rounded-xl border border-white/[0.07] overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_60px_100px_90px_80px_28px] gap-0 px-3 py-2 bg-white/[0.02] border-b border-white/[0.06]">
                      {['Component', 'Qty', 'Condition', 'Recover?', 'Cost', ''].map((h, i) => (
                        <p key={i} className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider text-center first:text-left">
                          {h}
                        </p>
                      ))}
                    </div>

                    {components.map((row, idx) => {
                      const cond = CONDITION_CONFIG[row.condition];
                      return (
                        <div
                          key={row.key}
                          className={cn(
                            'grid grid-cols-[1fr_60px_100px_90px_80px_28px] gap-0 items-center px-3 py-2.5',
                            idx !== components.length - 1 && 'border-b border-white/[0.04]',
                            !row.recovered && 'opacity-60',
                          )}
                        >
                          {/* Product info */}
                          <div className="flex items-center gap-2 pr-2 min-w-0">
                            <div className="size-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                              <Package className="size-3.5 text-zinc-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-white leading-tight truncate">{row.product?.name}</p>
                              <p className="font-mono text-[10px] text-zinc-600">{row.product?.item_code}</p>
                            </div>
                          </div>

                          {/* Qty */}
                          <input
                            type="number"
                            min="1"
                            value={row.qty}
                            onChange={e => updateComp(row.key, 'qty', parseFloat(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white text-center outline-none focus:border-rose-500/50"
                          />

                          {/* Condition */}
                          <div className="px-1">
                            <select
                              value={row.condition}
                              onChange={e => updateComp(row.key, 'condition', e.target.value as Condition)}
                              className={cn(
                                'w-full px-2 py-1.5 rounded-lg text-xs font-medium outline-none appearance-none border text-center',
                                row.condition === 'good'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : row.condition === 'damaged'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                  : 'bg-red-500/10 border-red-500/20 text-red-400',
                              )}
                            >
                              <option value="good">Good</option>
                              <option value="damaged">Damaged</option>
                              <option value="scrap">Scrap</option>
                            </select>
                          </div>

                          {/* Recover toggle */}
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => updateComp(row.key, 'recovered', !row.recovered)}
                              className={cn(
                                'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all',
                                row.recovered
                                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-zinc-800/60 border-white/[0.08] text-zinc-500 hover:bg-white/10',
                              )}
                            >
                              {row.recovered ? (
                                <><ArrowUpCircle className="size-3" /> Stock</>
                              ) : (
                                <><X className="size-3" /> Skip</>
                              )}
                            </button>
                          </div>

                          {/* Unit cost */}
                          <div className="px-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.unit_cost}
                              onChange={e => updateComp(row.key, 'unit_cost', parseFloat(e.target.value) || 0)}
                              disabled={!row.recovered}
                              className="w-full px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white text-right outline-none focus:border-rose-500/50 disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => removeComp(row.key)}
                            className="size-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add component search */}
                <ProductSearch
                  placeholder="Add a component part…"
                  excludeIds={excludedIds}
                  onSelect={addComponent}
                  accentColor="rose"
                />

                {components.length === 0 && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <Info className="size-4 text-zinc-600 flex-shrink-0" />
                    <p className="text-xs text-zinc-500">
                      Search and add each part you're extracting. Toggle <strong className="text-zinc-300">Recover</strong> to add it to inventory stock, or <strong className="text-zinc-300">Skip</strong> for parts already sold or scrapped.
                    </p>
                  </div>
                )}
              </Card>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <AlertCircle className="size-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pb-10">
                <button
                  onClick={() => router.back()}
                  className="px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-zinc-300 text-sm font-medium hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={
                    create.isPending ||
                    !parent ||
                    qtyNum <= 0 ||
                    !stockOk ||
                    components.length === 0
                  }
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {create.isPending
                    ? <><RefreshCw className="size-4 animate-spin" />Processing…</>
                    : <><Scissors className="size-4" />Confirm Disassembly</>
                  }
                </button>
              </div>
            </div>

            {/* ── Right column — Summary panel ─────────────────────────────── */}
            <div className="space-y-4 sticky top-6 self-start">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Preview</p>
                </div>

                <div className="p-4 space-y-4">
                  {/* Stock OUT */}
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                      Stock Reduction
                    </p>
                    {parent ? (
                      <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-red-500/5 border border-red-500/15">
                        <ArrowDownCircle className="size-4 text-red-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-white font-medium truncate">{parent.name}</p>
                          <p className="text-[11px] text-red-400 font-semibold">−{qtyNum || '?'} units</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-14 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                        <p className="text-xs text-zinc-600">Select item first</p>
                      </div>
                    )}
                  </div>

                  {/* Recovered components */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                        Recover to Stock
                      </p>
                      {recoveredRows.length > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          +{recoveredRows.length}
                        </span>
                      )}
                    </div>
                    {recoveredRows.length > 0 ? (
                      <div className="space-y-1.5">
                        {recoveredRows.map(r => (
                          <div key={r.key} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                            <ArrowUpCircle className="size-3.5 text-emerald-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white truncate">{r.product?.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-emerald-400 font-semibold">
                                  +{r.qty * qtyNum}
                                </span>
                                <span className={cn(
                                  'text-[10px] font-medium',
                                  r.condition === 'good'    ? 'text-emerald-500' :
                                  r.condition === 'damaged' ? 'text-amber-500'   : 'text-red-500',
                                )}>
                                  {r.condition}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-12 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                        <p className="text-xs text-zinc-600">No parts to recover</p>
                      </div>
                    )}
                  </div>

                  {/* Skipped */}
                  {skippedRows.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                          Skipped / Sold
                        </p>
                        <span className="text-[10px] font-semibold text-zinc-500 bg-white/[0.05] px-1.5 py-0.5 rounded-full">
                          {skippedRows.length}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {skippedRows.map(r => (
                          <div key={r.key} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                            <X className="size-3.5 text-zinc-600 flex-shrink-0" />
                            <p className="text-xs text-zinc-500 truncate">{r.product?.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cost summary */}
                  {unitCostNum > 0 && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Unit cost basis</span>
                        <span className="text-white font-semibold">{fmt(unitCostNum)}</span>
                      </div>
                      {qtyNum > 1 && (
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-zinc-500">Total ({qtyNum}×)</span>
                          <span className="text-zinc-300 font-semibold">{fmt(unitCostNum * qtyNum)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Info callout */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  <strong className="text-zinc-300">Recover</strong> — adds the part to inventory with a stock movement.<br />
                  <strong className="text-zinc-300">Skip</strong> — logs the part but makes no stock change (for parts already sold or scrapped).
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small reusable components ────────────────────────────────────────────────

function Card({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <div className="px-5 py-3.5 border-b border-white/[0.06]">
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-xs font-medium text-zinc-400 mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </p>
  );
}
