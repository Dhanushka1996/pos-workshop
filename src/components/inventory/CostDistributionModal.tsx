'use client';

import { useState, useEffect } from 'react';
import { X, Sliders, Zap, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { cn }               from '@/lib/utils';
import { useCurrency }      from '@/hooks/useCurrency';
import { useCostDistribution } from '@/hooks/inventory/useAssemblies';
import type { Assembly, AssemblyComponent } from '@/hooks/inventory/useAssemblies';

export const dynamic = 'force-dynamic';

interface Props {
  assembly: Assembly;
  onClose:  () => void;
  onDone?:  () => void;
}

type Mode = 'manual' | 'equal' | 'proportional';

export function CostDistributionModal({ assembly, onClose, onDone }: Props) {
  const { fmt } = useCurrency();
  const distribute = useCostDistribution(assembly.id);

  const [mode, setMode] = useState<Mode>('equal');
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');

  const totalBudget = assembly.purchase_cost;
  const components  = assembly.components.filter(c => c.qty_total - c.qty_extracted > 0 || c.qty_total > 0);

  // Initialise from current values or auto-distribute
  useEffect(() => {
    const init: Record<string, number> = {};
    components.forEach(c => { init[c.id] = c.allocated_cost; });
    setCosts(init);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoDistribute = (m: Mode) => {
    if (!components.length) return;
    const next: Record<string, number> = {};
    if (m === 'equal') {
      const per = Math.round((totalBudget / components.length) * 100) / 100;
      components.forEach(c => { next[c.id] = per; });
    } else if (m === 'proportional') {
      const totalQty = components.reduce((s, c) => s + c.qty_total, 0);
      components.forEach(c => {
        next[c.id] = totalQty > 0
          ? Math.round((c.qty_total / totalQty) * totalBudget * 100) / 100
          : 0;
      });
    }
    setCosts(prev => m === 'manual' ? prev : next);
  };

  const totalAllocated = Object.values(costs).reduce((s, v) => s + (v || 0), 0);
  const remaining      = totalBudget - totalAllocated;
  const isBalanced     = Math.abs(remaining) < 1;

  const handleModeChange = (m: Mode) => {
    setMode(m);
    if (m !== 'manual') autoDistribute(m);
  };

  const handleSave = async () => {
    setErr('');
    try {
      if (mode === 'manual') {
        await distribute.mutateAsync({
          mode: 'manual',
          components: Object.entries(costs).map(([id, allocated_cost]) => ({ id, allocated_cost })),
        });
      } else {
        await distribute.mutateAsync({ mode });
      }
      setSuccess(true);
      setTimeout(() => { onDone?.(); onClose(); }, 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-brand-400" />
            <h2 className="font-semibold text-white">Cost Distribution</h2>
          </div>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Budget info */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <p className="text-xs text-zinc-500">Assembly Purchase Cost</p>
              <p className="text-xl font-bold text-white tabular-nums">{fmt(totalBudget)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Remaining to Allocate</p>
              <p className={cn('text-lg font-bold tabular-nums', isBalanced ? 'text-emerald-400' : Math.abs(remaining) < 10 ? 'text-amber-400' : 'text-red-400')}>
                {fmt(Math.abs(remaining))}{remaining < 0 ? ' over' : remaining > 0 ? ' left' : ''}
              </p>
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wider">Distribution Method</p>
            <div className="flex gap-2">
              {(['equal', 'proportional', 'manual'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-all border',
                    mode === m
                      ? 'bg-brand-600 border-brand-500 text-white'
                      : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]',
                  )}
                >
                  {m === 'equal' ? 'Equal Split' : m === 'proportional' ? 'By Quantity' : 'Manual'}
                </button>
              ))}
            </div>
          </div>

          {/* Components table */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {components.length === 0 ? (
              <p className="text-center text-xs text-zinc-600 py-4">No components to distribute costs to.</p>
            ) : (
              components.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{c.product.name}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">{c.product.item_code} · qty {c.qty_total}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={costs[c.id] ?? 0}
                      onChange={e => setCosts(prev => ({ ...prev, [c.id]: parseFloat(e.target.value) || 0 }))}
                      disabled={mode !== 'manual'}
                      className={cn(
                        'w-28 px-2 py-1.5 rounded-lg text-sm text-right text-white border transition-all outline-none',
                        mode === 'manual'
                          ? 'bg-white/[0.06] border-white/20 focus:border-brand-500'
                          : 'bg-transparent border-transparent text-zinc-300 cursor-default',
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total bar */}
          <div className="flex items-center justify-between text-sm pt-1 border-t border-white/[0.06]">
            <span className="text-zinc-500">Total Allocated</span>
            <span className={cn('font-bold tabular-nums', isBalanced ? 'text-emerald-400' : 'text-white')}>
              {fmt(totalAllocated)}
              {isBalanced && <Check className="inline size-3.5 ml-1" />}
            </span>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="size-3.5" />{err}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-emerald-400">
              <Check className="size-4" /> Cost distribution saved!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all border border-white/10">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={distribute.isPending || success}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all disabled:opacity-60"
          >
            {distribute.isPending
              ? <><RefreshCw className="size-3.5 animate-spin" />Saving…</>
              : <><Zap className="size-3.5" />Apply Distribution</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
