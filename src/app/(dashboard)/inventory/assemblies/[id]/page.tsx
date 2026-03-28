'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Wrench, Package, CheckCircle2,
  Plus, Zap, RefreshCw, History,
  Trash2, AlertCircle, TrendingUp, Sliders, Search, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import {
  useAssembly, useDismantle, useAddComponent, useRemoveComponent,
  getAssemblyProgress, getComponentRemaining,
  type AssemblyComponent, type AssemblyStatus,
} from '@/hooks/inventory/useAssemblies';
import { useProducts } from '@/hooks/inventory/useProducts';
import { AssemblyBreakdownModal }   from '@/components/inventory/AssemblyBreakdownModal';
import { CostDistributionModal }    from '@/components/inventory/CostDistributionModal';

// ── Status config ──────────────────────────────────────────────────────────
const STATUS: Record<AssemblyStatus, { label: string; color: string }> = {
  intact:   { label: 'Intact',   color: 'sky'     },
  partial:  { label: 'Partial',  color: 'amber'   },
  complete: { label: 'Complete', color: 'emerald' },
};

export default function AssemblyDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const { fmt } = useCurrency();

  const { data: assembly, isLoading, error } = useAssembly(id);
  const dismantle   = useDismantle(id);
  const addComponent = useAddComponent(id);

  // Extraction inputs: component_id → qty to extract
  const [extractQty,    setExtractQty]    = useState<Record<string, number>>({});
  const [extractNotes,  setExtractNotes]  = useState('');
  const [showHistory,   setShowHistory]   = useState(false);
  const [showSuccess,   setShowSuccess]   = useState<string | null>(null);
  const [dismantleErr,  setDismantleErr]  = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showCostDist,  setShowCostDist]  = useState(false);

  // Add-component form state
  const [showAddComp,  setShowAddComp]  = useState(false);
  const [compSearch,   setCompSearch]   = useState('');
  const [compProduct,  setCompProduct]  = useState<{ id: string; name: string; item_code: string; cost_price: number } | null>(null);
  const [compQty,      setCompQty]      = useState(1);
  const [compCost,     setCompCost]     = useState(0);
  const [compNotes,    setCompNotes]    = useState('');
  const [addCompErr,   setAddCompErr]   = useState('');

  const { data: searchResults } = useProducts(compSearch.length >= 2 ? { search: compSearch, limit: 8 } : {});
  const productList = searchResults?.products ?? [];

  // ── Extraction qty helpers ─────────────────────────────────────────
  const getQty  = (id: string) => extractQty[id] ?? 1;
  const setQty  = (id: string, v: number) => setExtractQty(prev => ({ ...prev, [id]: Math.max(0, v) }));

  const selectedCount = Object.values(extractQty).filter(q => q > 0).length;
  const hasSelections = Object.entries(extractQty).some(([, q]) => q > 0);

  // ── Select all / deselect all ──────────────────────────────────────
  const selectAll = () => {
    if (!assembly) return;
    const next: Record<string, number> = {};
    assembly.components.forEach(c => {
      const rem = getComponentRemaining(c);
      if (rem > 0) next[c.id] = rem;
    });
    setExtractQty(next);
  };

  const clearAll = () => setExtractQty({});

  // ── Progress ──────────────────────────────────────────────────────
  const progress = useMemo(
    () => getAssemblyProgress(assembly?.components ?? []),
    [assembly?.components],
  );

  // ── Add component ─────────────────────────────────────────────────
  const handleAddComponent = async () => {
    if (!compProduct) return;
    setAddCompErr('');
    try {
      await addComponent.mutateAsync({
        product_id:     compProduct.id,
        qty_total:      compQty,
        allocated_cost: compCost,
        notes:          compNotes || undefined,
      });
      setShowAddComp(false);
      setCompSearch('');
      setCompProduct(null);
      setCompQty(1);
      setCompCost(0);
      setCompNotes('');
    } catch (e) {
      setAddCompErr(e instanceof Error ? e.message : 'Failed to add component');
    }
  };

  // ── Execute dismantle ─────────────────────────────────────────────
  const handleDismantle = async () => {
    if (!hasSelections) return;
    setDismantleErr('');

    const extractions = Object.entries(extractQty)
      .filter(([, q]) => q > 0)
      .map(([component_id, qty]) => ({ component_id, qty }));

    try {
      const result = await dismantle.mutateAsync({ extractions, notes: extractNotes || undefined });
      setShowSuccess(
        `${result.extracted} component type${result.extracted !== 1 ? 's' : ''} extracted successfully`,
      );
      setExtractQty({});
      setExtractNotes('');
      setTimeout(() => setShowSuccess(null), 5000);
    } catch (err) {
      setDismantleErr(err instanceof Error ? err.message : 'Dismantling failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <RefreshCw className="size-6 animate-spin mr-2" />
        <span className="text-sm">Loading assembly…</span>
      </div>
    );
  }

  if (error || !assembly) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="size-10 text-red-400" />
        <p className="text-white font-medium">Assembly not found</p>
        <button onClick={() => router.push('/inventory/assemblies')} className="text-sm text-brand-400 underline">
          Back to list
        </button>
      </div>
    );
  }

  const status    = STATUS[assembly.status as AssemblyStatus];
  const isComplete = assembly.status === 'complete';

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06]">
        <button
          onClick={() => router.push('/inventory/assemblies')}
          className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-lg font-semibold text-white truncate">{assembly.product.name}</p>
            <span className={cn(
              'text-[10px] font-bold px-2.5 py-1 rounded-full border',
              status.color === 'sky'     ? 'border-sky-500/20 bg-sky-500/10 text-sky-400'
              : status.color === 'amber' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
            )}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-500 font-mono">{assembly.product.item_code}</span>
            {assembly.ref_number && (
              <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                {assembly.ref_number}
              </span>
            )}
            {assembly.reference && (
              <span className="text-xs text-zinc-500">· {assembly.reference}</span>
            )}
          </div>
        </div>

        {/* Breakdown button — only when not already complete */}
        {!isComplete && assembly.components.length > 0 && (
          <button
            onClick={() => setShowBreakdown(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-xs font-medium transition-all"
          >
            <Wrench className="size-3.5" />
            Breakdown
          </button>
        )}

        {/* Distribute costs — when components exist */}
        {assembly.components.length > 0 && (
          <button
            onClick={() => setShowCostDist(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-xs font-medium transition-all"
          >
            <Sliders className="size-3.5" />
            Costs
          </button>
        )}

        <button
          onClick={() => setShowHistory(h => !h)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
            showHistory
              ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
              : 'border-white/10 text-zinc-400 hover:text-white hover:border-white/20',
          )}
        >
          <History className="size-3.5" />
          History
          {(assembly.dismantle_logs?.length ?? 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10">
              {assembly.dismantle_logs?.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-white/[0.06] flex items-center gap-6 flex-wrap">
        <Stat label="Purchase Cost"       value={fmt(assembly.purchase_cost)} />
        <Stat label="Components"          value={String(assembly.components.length)} />
        <Stat label="Units Extracted"     value={`${progress.extractedUnits} / ${progress.totalUnits}`} />
        <Stat
          label="Progress"
          value={`${Math.round(progress.pct)}%`}
          valueClass={progress.pct === 100 ? 'text-emerald-400' : progress.pct > 0 ? 'text-amber-400' : 'text-zinc-400'}
        />

        {/* Progress bar */}
        <div className="flex-1 min-w-[120px]">
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                progress.pct === 100 ? 'bg-emerald-500' : progress.pct > 0 ? 'bg-amber-500' : 'bg-zinc-700',
              )}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* Components panel */}
        <div className={cn('flex-1 flex flex-col overflow-hidden', showHistory ? 'border-r border-white/[0.06]' : '')}>

          {/* Extraction toolbar */}
          {!isComplete && assembly.components.length > 0 && (
            <div className="px-6 py-3 border-b border-white/[0.06] flex items-center gap-3 flex-wrap">
              <button onClick={selectAll} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Select all remaining
              </button>
              {hasSelections && (
                <>
                  <span className="text-zinc-700">·</span>
                  <button onClick={clearAll} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    Clear
                  </button>
                  <span className="text-zinc-700">·</span>
                  <span className="text-xs text-zinc-400">{selectedCount} type{selectedCount !== 1 ? 's' : ''} selected</span>
                </>
              )}

              <div className="ml-auto flex items-center gap-2">
                <input
                  value={extractNotes}
                  onChange={e => setExtractNotes(e.target.value)}
                  placeholder="Extraction notes (optional)…"
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-brand-500/50 w-52"
                />
                <button
                  onClick={handleDismantle}
                  disabled={!hasSelections || dismantle.isPending}
                  className={cn(
                    'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
                    hasSelections
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-white/[0.05] text-zinc-500 cursor-not-allowed',
                  )}
                >
                  {dismantle.isPending
                    ? <><RefreshCw className="size-3.5 animate-spin" />Extracting…</>
                    : <><Zap className="size-3.5" />Extract ({selectedCount})</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Success / error banners */}
          {showSuccess && (
            <div className="mx-6 mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle2 className="size-4 text-emerald-400 flex-shrink-0" />
              <p className="text-sm text-emerald-400">{showSuccess}</p>
            </div>
          )}
          {dismantleErr && (
            <div className="mx-6 mt-3 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertCircle className="size-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{dismantleErr}</p>
            </div>
          )}

          {/* Complete banner */}
          {isComplete && (
            <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle2 className="size-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">Assembly Fully Dismantled</p>
                <p className="text-xs text-emerald-400/70 mt-0.5">All components have been extracted. Check inventory for updated stock levels.</p>
              </div>
            </div>
          )}

          {/* Component grid */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Add Component button / form */}
            {!isComplete && (
              <div className="mb-4">
                {!showAddComp ? (
                  <button
                    onClick={() => setShowAddComp(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/20 text-zinc-500 hover:text-white hover:border-white/40 text-xs transition-all"
                  >
                    <Plus className="size-3.5" />
                    Add Component
                  </button>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white">Add Component</p>
                      <button onClick={() => { setShowAddComp(false); setCompProduct(null); setCompSearch(''); setAddCompErr(''); }}
                        className="size-6 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                        <X className="size-3.5" />
                      </button>
                    </div>

                    {/* Product search */}
                    <div className="relative">
                      {compProduct ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{compProduct.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{compProduct.item_code}</p>
                          </div>
                          <button onClick={() => { setCompProduct(null); setCompSearch(''); }}
                            className="text-zinc-500 hover:text-white transition-colors">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                            <input
                              value={compSearch}
                              onChange={e => setCompSearch(e.target.value)}
                              placeholder="Search product by name or code…"
                              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-brand-500/50"
                            />
                          </div>
                          {productList.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                              {productList.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => { setCompProduct({ id: p.id, name: p.name, item_code: p.item_code, cost_price: p.cost_price ?? 0 }); setCompCost(p.cost_price ?? 0); setCompSearch(''); }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.06] transition-colors text-left"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white truncate">{p.name}</p>
                                    <p className="text-[10px] text-zinc-500 font-mono">{p.item_code}</p>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 flex-shrink-0">Stock: {p.current_stock}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Qty + Cost row */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 mb-1 block">Qty Total</label>
                        <input
                          type="number" min="1" value={compQty}
                          onChange={e => setCompQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white outline-none focus:border-brand-500/50"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 mb-1 block">Allocated Cost</label>
                        <input
                          type="number" min="0" step="100" value={compCost}
                          onChange={e => setCompCost(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white outline-none focus:border-brand-500/50"
                        />
                      </div>
                    </div>

                    {addCompErr && <p className="text-xs text-red-400">{addCompErr}</p>}

                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={() => { setShowAddComp(false); setCompProduct(null); setCompSearch(''); setAddCompErr(''); }}
                        className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/10 transition-all">
                        Cancel
                      </button>
                      <button
                        onClick={handleAddComponent}
                        disabled={!compProduct || addComponent.isPending}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all disabled:opacity-50"
                      >
                        {addComponent.isPending ? <><RefreshCw className="size-3 animate-spin" />Adding…</> : <><Plus className="size-3" />Add</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {assembly.components.length === 0 && !showAddComp ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Package className="size-10 text-zinc-800 mb-3" />
                <p className="text-sm">No components defined yet</p>
                <p className="text-xs text-zinc-600 mt-1">Use "Add Component" above to define the BOM</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {assembly.components.map(comp => (
                  <ComponentCard
                    key={comp.id}
                    component={comp}
                    fmt={fmt}
                    qty={getQty(comp.id)}
                    onQtyChange={v => setQty(comp.id, v)}
                    isComplete={isComplete}
                    assemblyId={id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Breakdown modal */}
        {showBreakdown && (
          <AssemblyBreakdownModal
            assembly={assembly}
            onClose={() => setShowBreakdown(false)}
            onDone={() => setShowBreakdown(false)}
          />
        )}

        {/* Cost Distribution modal */}
        {showCostDist && (
          <CostDistributionModal
            assembly={assembly}
            onClose={() => setShowCostDist(false)}
            onDone={() => setShowCostDist(false)}
          />
        )}

        {/* History panel */}
        {showHistory && (
          <div className="w-80 flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">Extraction History</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!assembly.dismantle_logs?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <History className="size-8 text-zinc-800 mb-2" />
                  <p className="text-xs">No extractions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {assembly.dismantle_logs?.map(log => (
                    <div key={log.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{log.product.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{log.product.item_code}</p>
                          {log.notes && <p className="text-[10px] text-zinc-600 mt-0.5 italic truncate">{log.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 flex-shrink-0">
                          <TrendingUp className="size-2.5" />
                          +{log.qty_extracted}
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {new Date(log.created_at).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Component Card ──────────────────────────────────────────────────────────
function ComponentCard({
  component, fmt, qty, onQtyChange, isComplete, assemblyId,
}: {
  component:   AssemblyComponent;
  fmt:         (n: number) => string;
  qty:         number;
  onQtyChange: (v: number) => void;
  isComplete:  boolean;
  assemblyId:  string;
}) {
  const removeComponent  = useRemoveComponent(assemblyId);
  const remaining        = getComponentRemaining(component);
  const isDepleted       = remaining <= 0;
  const isPartial        = component.qty_extracted > 0 && !isDepleted;
  const extractionActive = qty > 0 && !isDepleted;

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      isDepleted
        ? 'border-emerald-500/15 bg-emerald-500/[0.03] opacity-70'
        : extractionActive
        ? 'border-amber-500/40 bg-amber-500/[0.06] shadow-amber-500/10 shadow-md'
        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15',
    )}>
      {/* Component header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate">{component.product.name}</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{component.product.item_code}</p>
        </div>
        {isDepleted
          ? <CheckCircle2 className="size-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          : isPartial
          ? <Wrench className="size-4 text-amber-400 flex-shrink-0 mt-0.5" />
          : null
        }
      </div>

      {/* Qty bars */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        <QtyCell label="Total"     value={component.qty_total}     color="zinc"    />
        <QtyCell label="Extracted" value={component.qty_extracted} color="amber"   />
        <QtyCell label="Remaining" value={remaining}               color={isDepleted ? 'emerald' : 'sky'} />
      </div>

      {/* Allocated cost */}
      {component.allocated_cost > 0 && (
        <p className="text-[10px] text-zinc-500 mb-3">
          Allocated: <span className="text-zinc-300 font-medium">{fmt(component.allocated_cost)}</span>
          {component.qty_total > 0 && (
            <span className="text-zinc-600"> ({fmt(component.allocated_cost / component.qty_total)}/unit)</span>
          )}
        </p>
      )}

      {/* Current stock */}
      <p className="text-[10px] text-zinc-600 mb-3">
        Stock: <span className={cn('font-medium', component.product.current_stock > 0 ? 'text-zinc-400' : 'text-red-400/70')}>
          {component.product.current_stock}
        </span>
      </p>

      {/* Extraction control */}
      {!isComplete && !isDepleted && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onQtyChange(Math.max(0, qty - 1))}
            className="size-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-sm font-bold"
          >
            −
          </button>
          <input
            type="number"
            min="0"
            max={remaining}
            value={qty === 0 ? '' : qty}
            onChange={e => onQtyChange(Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0)))}
            className="flex-1 h-7 text-center bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white outline-none focus:border-amber-500/50"
          />
          <button
            onClick={() => onQtyChange(Math.min(remaining, qty + 1))}
            className="size-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-sm font-bold"
          >
            +
          </button>
          <button
            onClick={() => onQtyChange(remaining)}
            title="Extract all remaining"
            className="size-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/10 text-zinc-500 hover:text-amber-400 hover:border-amber-500/30 transition-all"
          >
            <Zap className="size-3.5" />
          </button>
        </div>
      )}

      {isDepleted && !isComplete && (
        <p className="text-xs text-emerald-400/70 text-center py-1">Fully extracted</p>
      )}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────
function QtyCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn(
      'text-center py-1.5 rounded-lg text-[10px]',
      color === 'amber'   ? 'bg-amber-500/10 text-amber-400'
      : color === 'sky'   ? 'bg-sky-500/10 text-sky-400'
      : color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400'
      : 'bg-white/[0.04] text-zinc-400',
    )}>
      <p className="font-bold text-base leading-tight">{value}</p>
      <p className="text-[9px] opacity-70 mt-0.5">{label}</p>
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className={cn('text-sm font-bold text-white', valueClass)}>{value}</p>
    </div>
  );
}
