'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Scissors, Package, Hash, ArrowDownCircle,
  ArrowUpCircle, X, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDisassembly, CONDITION_CONFIG } from '@/hooks/inventory/useDisassembly';
import { useCurrency } from '@/hooks/useCurrency';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export const dynamic = 'force-dynamic';

export default function DisassemblyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useDisassembly(id);
  const { fmt } = useCurrency();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-zinc-900/50 border border-white/[0.07] animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertCircle className="size-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Record not found</p>
          <p className="text-zinc-500 text-sm mt-1">This disassembly record may have been deleted</p>
          <Link
            href="/inventory/disassembly"
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-white/[0.06] border border-white/10 text-zinc-300 text-sm hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="size-4" /> Back to list
          </Link>
        </div>
      </div>
    );
  }

  const recovered = data.components.filter(c => c.recovered);
  const skipped   = data.components.filter(c => !c.recovered);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* ── Back + Breadcrumb ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/inventory/disassembly"
          className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <Link href="/dashboard/inventory" className="hover:text-zinc-400 transition-colors">Inventory</Link>
          <span>/</span>
          <Link href="/inventory/disassembly" className="hover:text-zinc-400 transition-colors">Disassembly</Link>
          <span>/</span>
          <span className="font-mono text-rose-400">{data.ref_number}</span>
        </div>
      </div>

      {/* ── Header Card ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Left: icon + ref + date */}
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                <Scissors className="size-6 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xl font-bold text-rose-300">{data.ref_number}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Disassembly
                  </span>
                </div>
                <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <Clock className="size-3" />
                  {formatDate(data.created_at)}
                </p>
              </div>
            </div>

            {/* Right: stats */}
            <div className="flex items-center gap-3">
              <StatPill
                icon={<ArrowDownCircle className="size-3.5" />}
                label="Disassembled"
                value={`×${data.quantity}`}
                color="red"
              />
              <StatPill
                icon={<ArrowUpCircle className="size-3.5" />}
                label="Recovered"
                value={`${recovered.length} parts`}
                color="emerald"
              />
              {skipped.length > 0 && (
                <StatPill
                  icon={<X className="size-3.5" />}
                  label="Skipped"
                  value={`${skipped.length} parts`}
                  color="zinc"
                />
              )}
            </div>
          </div>

          {/* Parent product */}
          <div className="mt-5 flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="size-10 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <Package className="size-5 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{data.product.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                <span className="font-mono">{data.product.item_code}</span>
                {data.product.brand?.name && ` · ${data.product.brand.name}`}
                {data.product.category?.name && ` · ${data.product.category.name}`}
                {' · '}Current stock: {data.product.current_stock}
              </p>
            </div>
            {data.unit_cost > 0 && (
              <div className="text-right">
                <p className="text-xs text-zinc-500">Unit cost</p>
                <p className="text-sm font-semibold text-white">{fmt(data.unit_cost)}</p>
              </div>
            )}
          </div>

          {data.notes && (
            <div className="mt-3 px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <p className="text-xs text-zinc-500 italic">{data.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Components Table ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Component Breakdown</p>
            <p className="text-xs text-zinc-500 mt-0.5">{data.components.length} extracted components</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Component', 'Item Code', 'Qty', 'Condition', 'Status', 'Cost'].map(h => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {data.components.map(comp => {
              const cond = CONDITION_CONFIG[comp.condition as keyof typeof CONDITION_CONFIG] ?? CONDITION_CONFIG.good;
              return (
                <tr key={comp.id} className={cn('hover:bg-white/[0.02] transition-colors', !comp.recovered && 'opacity-60')}>
                  {/* Product */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'size-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        comp.recovered ? 'bg-emerald-500/10' : 'bg-white/[0.03]',
                      )}>
                        <Package className={cn('size-4', comp.recovered ? 'text-emerald-500' : 'text-zinc-600')} />
                      </div>
                      <div>
                        <p className="text-white font-medium leading-tight">{comp.product.name}</p>
                        {comp.notes && (
                          <p className="text-[11px] text-zinc-500 mt-0.5 italic">{comp.notes}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Item code */}
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded">
                      {comp.product.item_code}
                    </span>
                  </td>

                  {/* Qty */}
                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'text-sm font-bold',
                      comp.recovered ? 'text-emerald-400' : 'text-zinc-500',
                    )}>
                      {comp.recovered ? '+' : ''}{comp.qty * data.quantity}
                    </span>
                    {data.quantity > 1 && (
                      <span className="text-[10px] text-zinc-600 ml-1">({comp.qty}×{data.quantity})</span>
                    )}
                  </td>

                  {/* Condition */}
                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border',
                      cond.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      cond.color === 'amber'   ? 'bg-amber-500/10  border-amber-500/20  text-amber-400'   :
                                                 'bg-red-500/10    border-red-500/20    text-red-400',
                    )}>
                      {cond.label}
                    </span>
                  </td>

                  {/* Recovery status */}
                  <td className="px-5 py-3.5">
                    {comp.recovered ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="size-3.5" /> Added to stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                        <X className="size-3.5" /> Skipped
                      </span>
                    )}
                  </td>

                  {/* Cost */}
                  <td className="px-5 py-3.5 text-zinc-400 text-xs">
                    {comp.unit_cost > 0 ? fmt(comp.unit_cost) : <span className="text-zinc-700">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Stock Movements ──────────────────────────────────────────────────── */}
      {data.movements && data.movements.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white">Stock Movements</p>
            <p className="text-xs text-zinc-500 mt-0.5">All inventory changes created by this disassembly</p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Product', 'Type', 'Change', 'Balance After'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.movements.map(mov => (
                <tr key={mov.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-white font-medium">{mov.product.name}</p>
                    <p className="font-mono text-[11px] text-zinc-500">{mov.product.item_code}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border',
                      mov.type === 'DISMANTLE_IN'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400',
                    )}>
                      {mov.type === 'DISMANTLE_IN'
                        ? <><ArrowUpCircle className="size-3" />IN</>
                        : <><ArrowDownCircle className="size-3" />OUT</>
                      }
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'text-sm font-bold',
                      mov.quantity > 0 ? 'text-emerald-400' : 'text-red-400',
                    )}>
                      {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400 text-sm">
                    {mov.balance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'red' | 'emerald' | 'zinc';
}) {
  const styles = {
    red:     'bg-red-500/10 border-red-500/20 text-red-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    zinc:    'bg-white/[0.05] border-white/[0.08] text-zinc-400',
  };
  return (
    <div className={cn('flex flex-col items-center px-4 py-2.5 rounded-xl border', styles[color])}>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        {icon}
        {value}
      </div>
      <p className="text-[10px] opacity-70 mt-0.5">{label}</p>
    </div>
  );
}
