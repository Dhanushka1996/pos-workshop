'use client';

import {
  useState, useEffect, useRef, useCallback, KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, Wrench, Package, Search,
  RefreshCw, AlertCircle, Link2, Hash, Layers,
  Tag, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useCreateAssembly } from '@/hooks/inventory/useAssemblies';
import { useCategories } from '@/hooks/inventory/useCategories';
import { useBrands } from '@/hooks/inventory/useBrands';

export const dynamic = 'force-dynamic';

// ── Types ──────────────────────────────────────────────────────────────────
interface ProductOption {
  id: string;
  item_code: string;
  name: string;
  cost_price: number;
  retail_price: number;
  current_stock: number;
  brand?: { name: string } | null;
  vehicle_compatibility?: string | null;
}

interface ComponentRow {
  key:            string;
  product:        ProductOption | null;
  qty_total:      number;
  allocated_cost: number;
  notes:          string;
}

type CostDistribution = 'manual' | 'equal' | 'by_value';
type CreateMode       = 'new' | 'existing';

// ── Highlight matched text ─────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-amber-400/20 text-amber-300 rounded-sm not-italic">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ── Enhanced Component Search Dropdown ────────────────────────────────────
function ComponentSearch({
  excludeIds,
  onSelect,
}: {
  excludeIds?: string[];
  onSelect: (p: ProductOption) => void;
}) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<ProductOption[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [open,      setOpen]      = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref         = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/inventory/products?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      const all  = (data.products ?? data ?? []) as ProductOption[];
      setResults(all.filter(p => !excludeIds?.includes(p.id)));
      setOpen(true);
      setActiveIdx(-1);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [excludeIds]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 220);
    return () => clearTimeout(t);
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-item]');
    (items[activeIdx] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const select = (p: ProductOption) => {
    onSelect(p);
    setQuery('');
    setResults([]);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      select(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors',
        open
          ? 'bg-white/[0.05] border-amber-500/40'
          : 'bg-white/[0.03] border-white/[0.08] focus-within:border-amber-500/40',
      )}>
        <Search className="size-3.5 text-zinc-500 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); if (!open && e.target.value) setOpen(true); }}
          onFocus={() => { if (results.length) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, code, or brand…  ↑↓ to navigate, Enter to select"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
        />
        {loading && <RefreshCw className="size-3.5 text-zinc-500 animate-spin flex-shrink-0" />}
      </div>

      {open && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-zinc-900 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden"
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
                  i === activeIdx
                    ? 'bg-amber-500/10'
                    : 'hover:bg-white/[0.04]',
                )}
              >
                <div className={cn(
                  'size-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  i === activeIdx ? 'bg-amber-500/20' : 'bg-white/[0.05]',
                )}>
                  <Package className={cn('size-4', i === activeIdx ? 'text-amber-400' : 'text-zinc-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Item code + brand row */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] text-zinc-500 bg-white/[0.05] px-1.5 py-0.5 rounded">
                      <Highlight text={p.item_code} query={query} />
                    </span>
                    {p.brand && (
                      <span className="text-[11px] text-zinc-600">{p.brand.name}</span>
                    )}
                  </div>
                  {/* Full name — no truncation */}
                  <p className="text-sm text-white leading-snug">
                    <Highlight text={p.name} query={query} />
                  </p>
                  {/* Compatibility + stock */}
                  <div className="flex items-center gap-3 mt-0.5">
                    {p.vehicle_compatibility && (
                      <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">
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
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-zinc-900 border border-white/[0.1] rounded-xl shadow-2xl px-4 py-4 text-center">
          <p className="text-sm text-zinc-500">No products found for "<span className="text-zinc-300">{query}</span>"</p>
        </div>
      )}
    </div>
  );
}

// ── Product Search for "Link Existing" mode ────────────────────────────────
function ParentProductSearch({
  onSelect,
  excludeIds,
}: {
  onSelect: (p: ProductOption) => void;
  excludeIds?: string[];
}) {
  return (
    <ComponentSearch
      excludeIds={excludeIds}
      onSelect={onSelect}
    />
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function NewAssemblyPage() {
  const router  = useRouter();
  const { fmt } = useCurrency();
  const createAssembly = useCreateAssembly();

  const { data: categories = [] } = useCategories();
  const { data: brands     = [] } = useBrands();

  // Create mode
  const [createMode, setCreateMode] = useState<CreateMode>('new');

  // Auto-generated previews
  const [previewRef,  setPreviewRef]  = useState('ASM-000001');
  const [previewCode, setPreviewCode] = useState('ASM00001');

  // Mode: new product fields
  const [newName,       setNewName]       = useState('');
  const [newItemCode,   setNewItemCode]   = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newBrandId,    setNewBrandId]    = useState('');

  // Mode: existing product
  const [parentProduct, setParentProduct] = useState<ProductOption | null>(null);

  // Shared fields
  const [purchaseCost, setPurchaseCost] = useState('');
  const [notes,        setNotes]        = useState('');

  // Components
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [costDist,   setCostDist]   = useState<CostDistribution>('manual');
  const [error,      setError]      = useState('');

  // Fetch ref preview on mount
  useEffect(() => {
    fetch('/api/assemblies/next-ref')
      .then(r => r.json())
      .then(d => {
        if (d.ref_number) setPreviewRef(d.ref_number);
        if (d.item_code)  setPreviewCode(d.item_code);
      })
      .catch(() => {});
  }, []);

  // Auto-fill item code when switching to new mode
  useEffect(() => {
    if (createMode === 'new' && !newItemCode) {
      setNewItemCode(previewCode);
    }
  }, [createMode, previewCode, newItemCode]);

  // ── Cost distribution ─────────────────────────────────────────────────
  const redistributeCost = useCallback((
    rows: ComponentRow[],
    method: CostDistribution,
    totalCost: number,
  ): ComponentRow[] => {
    if (!rows.length || totalCost <= 0) return rows;

    if (method === 'equal') {
      const per = totalCost / rows.length;
      return rows.map(r => ({ ...r, allocated_cost: Math.round(per * 100) / 100 }));
    }

    if (method === 'by_value') {
      const totalRetail = rows.reduce((s, r) => s + (r.product?.retail_price ?? 0) * r.qty_total, 0);
      if (!totalRetail) return rows;
      return rows.map(r => {
        const w = ((r.product?.retail_price ?? 0) * r.qty_total) / totalRetail;
        return { ...r, allocated_cost: Math.round(totalCost * w * 100) / 100 };
      });
    }

    return rows;
  }, []);

  const handleCostDistChange = (method: CostDistribution) => {
    setCostDist(method);
    setComponents(prev => redistributeCost(prev, method, parseFloat(purchaseCost) || 0));
  };

  const handlePurchaseCostBlur = () => {
    if (costDist !== 'manual') {
      setComponents(prev => redistributeCost(prev, costDist, parseFloat(purchaseCost) || 0));
    }
  };

  // ── Component management ──────────────────────────────────────────────
  const addComponent = (product: ProductOption) => {
    const newRow: ComponentRow = {
      key:            crypto.randomUUID(),
      product,
      qty_total:      1,
      allocated_cost: 0,
      notes:          '',
    };
    const next = [...components, newRow];
    setComponents(costDist !== 'manual' ? redistributeCost(next, costDist, parseFloat(purchaseCost) || 0) : next);
  };

  const updateComponent = (key: string, field: keyof ComponentRow, value: unknown) => {
    setComponents(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));
  };

  const removeComponent = (key: string) => {
    const next = components.filter(r => r.key !== key);
    setComponents(costDist !== 'manual' ? redistributeCost(next, costDist, parseFloat(purchaseCost) || 0) : next);
  };

  // ── Totals ────────────────────────────────────────────────────────────
  const totalAllocated  = components.reduce((s, r) => s + (r.allocated_cost || 0), 0);
  const purchaseCostNum = parseFloat(purchaseCost) || 0;
  const unallocated     = purchaseCostNum - totalAllocated;

  const excludedComponentIds = components.map(c => c.product?.id).filter(Boolean) as string[];

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');

    if (createMode === 'new' && !newName.trim()) {
      setError('Assembly name is required');
      return;
    }
    if (createMode === 'existing' && !parentProduct) {
      setError('Select an assembly product');
      return;
    }

    const comps = components
      .filter(r => r.product)
      .map(r => ({
        product_id:     r.product!.id,
        qty_total:      r.qty_total,
        allocated_cost: r.allocated_cost,
        notes:          r.notes || undefined,
      }));

    try {
      const payload = createMode === 'new'
        ? {
            product_data: {
              name:        newName.trim(),
              item_code:   newItemCode.trim() || undefined,
              category_id: newCategoryId || undefined,
              brand_id:    newBrandId    || undefined,
              cost_price:  purchaseCostNum,
            },
            purchase_cost: purchaseCostNum,
            notes:         notes || undefined,
            components:    comps,
          }
        : {
            product_id:    parentProduct!.id,
            purchase_cost: purchaseCostNum,
            notes:         notes || undefined,
            components:    comps,
          };

      const assembly = await createAssembly.mutateAsync(payload);
      router.push(`/inventory/assemblies/${assembly.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assembly');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06]">
        <button
          onClick={() => router.back()}
          className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Wrench className="size-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">New Assembly</h1>
            <p className="text-xs text-zinc-500">Define an assembly item and its Bill of Materials</p>
          </div>
        </div>
        {/* Auto reference badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <Hash className="size-3.5 text-amber-400" />
          <span className="text-sm font-mono font-bold text-amber-300">{previewRef}</span>
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Auto-assigned</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Assembly Product Section */}
          <Section
            title="Assembly Product"
            subtitle="The parent item being tracked in inventory"
            action={
              <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                <ModeTab active={createMode === 'new'}      onClick={() => setCreateMode('new')}>
                  <Plus className="size-3" /> New Product
                </ModeTab>
                <ModeTab active={createMode === 'existing'} onClick={() => setCreateMode('existing')}>
                  <Link2 className="size-3" /> Link Existing
                </ModeTab>
              </div>
            }
          >
            {createMode === 'new' ? (
              <div className="space-y-4">
                {/* Name + Code row */}
                <div className="grid grid-cols-[1fr_180px] gap-4">
                  <div>
                    <Label required>Assembly Name</Label>
                    <Input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g., 1JZ-GTE Engine, Honda Half-Cut…"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label>Item Code</Label>
                    <div className="relative">
                      <Input
                        value={newItemCode}
                        onChange={e => setNewItemCode(e.target.value)}
                        placeholder={previewCode}
                        className="pr-8"
                      />
                      <button
                        type="button"
                        title="Reset to auto-generated"
                        onClick={() => setNewItemCode(previewCode)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category + Brand row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600" />
                      <select
                        value={newCategoryId}
                        onChange={e => setNewCategoryId(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white outline-none focus:border-amber-500/50 appearance-none"
                      >
                        <option value="">No Category</option>
                        {(categories as { id: string; name: string }[]).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Brand</Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600" />
                      <select
                        value={newBrandId}
                        onChange={e => setNewBrandId(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white outline-none focus:border-amber-500/50 appearance-none"
                      >
                        <option value="">No Brand</option>
                        {(brands as { id: string; name: string }[]).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Link existing product */
              parentProduct ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Package className="size-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{parentProduct.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {parentProduct.item_code}
                      {parentProduct.brand && ` · ${parentProduct.brand.name}`}
                      {' · '}Stock: {parentProduct.current_stock}
                    </p>
                  </div>
                  <button
                    onClick={() => setParentProduct(null)}
                    className="size-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : (
                <ParentProductSearch
                  onSelect={p => {
                    setParentProduct(p);
                    if (!purchaseCost) setPurchaseCost(String(p.cost_price || ''));
                  }}
                  excludeIds={excludedComponentIds}
                />
              )
            )}
          </Section>

          {/* Purchase & Notes */}
          <Section title="Purchase Details" subtitle="Cost and reference information">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Cost</Label>
                <Input
                  type="number"
                  min="0"
                  value={purchaseCost}
                  onChange={e => setPurchaseCost(e.target.value)}
                  onBlur={handlePurchaseCostBlur}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Reference / Serial No.</Label>
                <Input placeholder="e.g., ABC-1234, JZXA100, Reg: WP-1234…" />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Condition, source, inspection notes…"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>
          </Section>

          {/* BOM Section */}
          <Section
            title="Bill of Materials"
            subtitle={`${components.length} component${components.length !== 1 ? 's' : ''} · Parts that will be extracted from this assembly`}
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Cost split:</span>
                <select
                  value={costDist}
                  onChange={e => handleCostDistChange(e.target.value as CostDistribution)}
                  className="text-xs bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-zinc-300 outline-none focus:border-amber-500/50"
                >
                  <option value="manual">Manual</option>
                  <option value="equal">Equal Split</option>
                  <option value="by_value">By Retail Value</option>
                </select>
              </div>
            }
          >
            {/* Component rows */}
            {components.length > 0 && (
              <div className="mb-4 rounded-xl border border-white/[0.07] overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_72px_130px_32px] gap-0 px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Component</p>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider text-center">Qty</p>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider text-right pr-1">Alloc. Cost</p>
                  <span />
                </div>

                {components.map((row, idx) => (
                  <div
                    key={row.key}
                    className={cn(
                      'grid grid-cols-[1fr_72px_130px_32px] gap-0 items-center px-4 py-2.5',
                      idx !== components.length - 1 && 'border-b border-white/[0.04]',
                    )}
                  >
                    {/* Component info */}
                    <div className="flex items-center gap-2.5 pr-3">
                      <div className="size-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                        <Package className="size-3.5 text-zinc-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white leading-tight">{row.product?.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-zinc-600 bg-white/[0.04] px-1.5 rounded">
                            {row.product?.item_code}
                          </span>
                          {row.product?.brand && (
                            <span className="text-[10px] text-zinc-600">{row.product.brand.name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Qty */}
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={row.qty_total}
                      onChange={e => {
                        const v = parseFloat(e.target.value) || 1;
                        updateComponent(row.key, 'qty_total', v);
                        if (costDist !== 'manual') {
                          setComponents(prev => redistributeCost(
                            prev.map(r => r.key === row.key ? { ...r, qty_total: v } : r),
                            costDist,
                            parseFloat(purchaseCost) || 0,
                          ));
                        }
                      }}
                      className="w-full px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white text-center outline-none focus:border-amber-500/50"
                    />

                    {/* Alloc cost */}
                    <div className="pl-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.allocated_cost}
                        onChange={e => updateComponent(row.key, 'allocated_cost', parseFloat(e.target.value) || 0)}
                        disabled={costDist !== 'manual'}
                        className="w-full px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white text-right outline-none focus:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeComponent(row.key)}
                      className="ml-1 size-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <ComponentSearch
              excludeIds={[
                ...(parentProduct ? [parentProduct.id] : []),
                ...excludedComponentIds,
              ]}
              onSelect={addComponent}
            />

            {/* Cost summary */}
            {purchaseCostNum > 0 && components.length > 0 && (
              <div className={cn(
                'mt-3 flex items-center justify-between text-xs px-4 py-2.5 rounded-xl border',
                Math.abs(unallocated) < 0.01
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                  : 'border-amber-500/20 bg-amber-500/5 text-amber-400',
              )}>
                <span>Allocated: <strong>{fmt(totalAllocated)}</strong> of {fmt(purchaseCostNum)}</span>
                <span>
                  {Math.abs(unallocated) < 0.01
                    ? '✓ Fully allocated'
                    : `${fmt(Math.abs(unallocated))} ${unallocated > 0 ? 'unallocated' : 'over-allocated'}`}
                </span>
              </div>
            )}
          </Section>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertCircle className="size-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 pb-8">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-zinc-300 text-sm font-medium hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                createAssembly.isPending ||
                (createMode === 'new' ? !newName.trim() : !parentProduct)
              }
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createAssembly.isPending
                ? <><RefreshCw className="size-4 animate-spin" />Creating…</>
                : <><Wrench className="size-4" />Create Assembly</>
              }
            </button>
            {components.length === 0 && (
              <p className="text-xs text-zinc-600 ml-2">
                Tip: you can add components now or after creation
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small reusable components ──────────────────────────────────────────────
function Section({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ModeTab({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
        active
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          : 'text-zinc-500 hover:text-zinc-300',
      )}
    >
      {children}
    </button>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-xs font-medium text-zinc-400 mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </p>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500/50 transition-colors',
        className,
      )}
    />
  );
}
