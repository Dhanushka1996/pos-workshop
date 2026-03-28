'use client';

/**
 * AssemblyBreakdownModal
 *
 * "Partial Breakdown During Sale/Use"
 *
 * The user selects which components were SOLD or USED outside the system.
 * Everything else is automatically recovered back into inventory stock.
 *
 * ✓ Sold / Used     → logged, no stock movement
 * ✓ Recovered       → DISMANTLE_IN stock movement, added to inventory
 * ✓ Assembly parent → DISMANTLE_OUT, stock –1, status → complete
 */

import { useState } from 'react';
import {
  X, Wrench, Package, ArrowUpCircle, ArrowDownCircle,
  RefreshCw, AlertCircle, CheckCircle2, ShoppingCart, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBreakdown, getComponentRemaining } from '@/hooks/inventory/useAssemblies';
import type { Assembly, AssemblyComponent } from '@/hooks/inventory/useAssemblies';
import { useCurrency } from '@/hooks/useCurrency';

interface Props {
  assembly: Assembly;
  onClose:  () => void;
  onDone?:  () => void;
}

export function AssemblyBreakdownModal({ assembly, onClose, onDone }: Props) {
  const { fmt }    = useCurrency();
  const breakdown  = useBreakdown(assembly.id);

  // Set of AssemblyComponent IDs that were SOLD / USED (user checks these)
  const [soldIds, setSoldIds] = useState<Set<string>>(new Set());
  const [notes,   setNotes]   = useState('');
  const [error,   setError]   = useState('');
  const [result,  setResult]  = useState<{
    recovered: { name: string; qty: number }[];
    sold:      { name: string; qty: number }[];
    message:   string;
  } | null>(null);

  // Only show components that still have remaining qty
  const activeComponents = assembly.components.filter(c => getComponentRemaining(c) > 0);

  const toggleSold = (compId: string) => {
    setSoldIds(prev => {
      const next = new Set(prev);
      if (next.has(compId)) next.delete(compId); else next.add(compId);
      return next;
    });
  };

  const selectAllSold      = () => setSoldIds(new Set(activeComponents.map(c => c.id)));
  const selectNoneSold     = () => setSoldIds(new Set());
  const toggleAllSold      = () =>
    soldIds.size === activeComponents.length ? selectNoneSold() : selectAllSold();

  // Derived
  const soldComponents      = activeComponents.filter(c => soldIds.has(c.id));
  const recoveredComponents = activeComponents.filter(c => !soldIds.has(c.id));

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setError('');
    try {
      const res = await breakdown.mutateAsync({
        usedComponentIds: Array.from(soldIds),
        notes:            notes || undefined,
      });
      setResult({
        recovered: res.recovered,
        sold:      res.sold,
        message:   res.summary.message,
      });
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Breakdown failed');
    }
  };

  // ── Success state ────────────────────────────────────────────────────────
  if (result) {
    return (
      <ModalShell onClose={onClose}>
        <div className="p-6 text-center">
          <div className="size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-7 text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-white mb-1">Breakdown Complete</p>
          <p className="text-sm text-zinc-400 mb-6">{result.message}</p>

          {result.recovered.length > 0 && (
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-500/15">
                <ArrowUpCircle className="size-4 text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-400">Added to Inventory</p>
              </div>
              {result.recovered.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-zinc-300">{r.name}</span>
                  <span className="text-emerald-400 font-bold">+{r.qty}</span>
                </div>
              ))}
            </div>
          )}

          {result.sold.length > 0 && (
            <div className="mb-6 rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
                <ShoppingCart className="size-4 text-zinc-500" />
                <p className="text-xs font-semibold text-zinc-500">Logged as Sold / Used</p>
              </div>
              {result.sold.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-zinc-500">{r.name}</span>
                  <span className="text-zinc-600">×{r.qty}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all"
          >
            Done
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <ModalShell onClose={onClose} wide>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Wrench className="size-4 text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Partial Breakdown</p>
            <p className="text-xs text-zinc-500">{assembly.product.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {assembly.ref_number && (
            <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              {assembly.ref_number}
            </span>
          )}
          <button
            onClick={onClose}
            className="size-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Empty guard */}
      {activeComponents.length === 0 && (
        <div className="px-6 py-12 text-center">
          <AlertTriangle className="size-8 text-amber-400 mx-auto mb-3" />
          <p className="text-white font-medium">No remaining components</p>
          <p className="text-zinc-500 text-sm mt-1">All components have already been extracted.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-zinc-300 text-sm hover:bg-white/10 transition-all">
            Close
          </button>
        </div>
      )}

      {activeComponents.length > 0 && (
        <div className="flex gap-0">
          {/* ── Left: component selector ─────────────────────────────────── */}
          <div className="flex-1 border-r border-white/[0.06]">
            {/* Instructions + select-all */}
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                <span className="text-white font-medium">Check</span> components that were sold or used
              </p>
              <button
                onClick={toggleAllSold}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                {soldIds.size === activeComponents.length ? 'Uncheck all' : 'Check all'}
              </button>
            </div>

            {/* Component list */}
            <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
              {activeComponents.map(comp => {
                const remaining = getComponentRemaining(comp);
                const isSold    = soldIds.has(comp.id);
                return (
                  <label
                    key={comp.id}
                    className={cn(
                      'flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors select-none',
                      isSold
                        ? 'bg-orange-500/[0.04] hover:bg-orange-500/[0.07]'
                        : 'hover:bg-emerald-500/[0.04]',
                    )}
                  >
                    {/* Checkbox */}
                    <div className={cn(
                      'size-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all',
                      isSold
                        ? 'bg-orange-500/20 border-orange-500/50'
                        : 'bg-white/[0.04] border-white/[0.15]',
                    )}>
                      {isSold && <ShoppingCart className="size-3 text-orange-400" />}
                    </div>

                    <input
                      type="checkbox"
                      checked={isSold}
                      onChange={() => toggleSold(comp.id)}
                      className="sr-only"
                    />

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium leading-tight', isSold ? 'text-zinc-400 line-through' : 'text-white')}>
                        {comp.product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-zinc-600 bg-white/[0.04] px-1.5 rounded">
                          {comp.product.item_code}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Remaining: {remaining}
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0',
                      isSold
                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                    )}>
                      {isSold ? 'Sold/Used' : '→ Stock'}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Notes */}
            <div className="px-5 py-4 border-t border-white/[0.06]">
              <p className="text-xs font-medium text-zinc-400 mb-1.5">Notes (optional)</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Sale reference, vehicle reg, reason for breakdown…"
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 resize-none transition-colors"
              />
            </div>
          </div>

          {/* ── Right: live preview ───────────────────────────────────────── */}
          <div className="w-64 flex flex-col">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Preview</p>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Parent OUT */}
              <PreviewSection
                icon={<ArrowDownCircle className="size-3.5 text-red-400" />}
                label="Assembly Consumed"
                color="red"
              >
                <div className="px-2.5 py-2 rounded-lg bg-red-500/5 border border-red-500/15">
                  <p className="text-xs text-white truncate">{assembly.product.name}</p>
                  <p className="text-[11px] text-red-400 font-semibold">Stock −1</p>
                </div>
              </PreviewSection>

              {/* Recovered IN */}
              <PreviewSection
                icon={<ArrowUpCircle className="size-3.5 text-emerald-400" />}
                label={`Recover to Stock (${recoveredComponents.length})`}
                color="emerald"
              >
                {recoveredComponents.length > 0 ? (
                  recoveredComponents.map(c => {
                    const rem = getComponentRemaining(c);
                    return (
                      <div key={c.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                        <Package className="size-3 text-emerald-500 flex-shrink-0" />
                        <p className="text-xs text-white truncate flex-1">{c.product.name}</p>
                        <span className="text-[11px] text-emerald-400 font-bold flex-shrink-0">+{rem}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-600 text-center py-2">
                    All components marked as sold
                  </p>
                )}
              </PreviewSection>

              {/* Sold / logged */}
              {soldComponents.length > 0 && (
                <PreviewSection
                  icon={<ShoppingCart className="size-3.5 text-orange-400" />}
                  label={`Sold / Used (${soldComponents.length})`}
                  color="orange"
                >
                  {soldComponents.map(c => (
                    <div key={c.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-xs text-zinc-500 truncate">{c.product.name}</p>
                    </div>
                  ))}
                </PreviewSection>
              )}

              {/* Cost summary */}
              {assembly.purchase_cost > 0 && (
                <div className="pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Cost basis</span>
                    <span className="text-white font-semibold">{fmt(assembly.purchase_cost)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="p-4 border-t border-white/[0.06] space-y-2">
              {error && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20 mb-2">
                  <AlertCircle className="size-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={breakdown.isPending || activeComponents.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {breakdown.isPending
                  ? <><RefreshCw className="size-4 animate-spin" />Processing…</>
                  : <><Wrench className="size-4" />Confirm Breakdown</>
                }
              </button>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-zinc-400 text-sm hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ── Small layout helpers ──────────────────────────────────────────────────────

function ModalShell({ children, onClose, wide }: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn(
        'relative z-10 rounded-2xl border border-white/[0.1] bg-zinc-900 shadow-2xl overflow-hidden',
        wide ? 'w-full max-w-2xl' : 'w-full max-w-sm',
      )}>
        {children}
      </div>
    </div>
  );
}

function PreviewSection({ icon, label, color, children }: {
  icon:     React.ReactNode;
  label:    string;
  color:    'red' | 'emerald' | 'orange';
  children: React.ReactNode;
}) {
  const labelColors = {
    red:     'text-red-400',
    emerald: 'text-emerald-400',
    orange:  'text-orange-400',
  };
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className={cn('text-[10px] font-semibold uppercase tracking-wider', labelColors[color])}>
          {label}
        </p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
