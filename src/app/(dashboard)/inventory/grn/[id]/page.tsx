'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Wrench, Package, RefreshCw, FileText,
  ChevronRight, AlertCircle,
  Building2, Calendar, Hash,
} from 'lucide-react';
import { cn }          from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useGRN }      from '@/hooks/inventory/useStockMovements';

export const dynamic = 'force-dynamic';

export default function GRNDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const { fmt } = useCurrency();

  const { data: grn, isLoading, error } = useGRN(id);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 gap-2">
        <RefreshCw className="size-5 animate-spin" />
        <span className="text-sm">Loading GRN…</span>
      </div>
    );
  }

  if (error || !grn) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="size-10 text-red-400" />
        <p className="text-white font-medium">GRN not found</p>
        <button onClick={() => router.push('/inventory/grn')} className="text-sm text-brand-400 underline">
          Back to list
        </button>
      </div>
    );
  }

  const assemblyItems = grn.items.filter(i => i.product.product_type === 'ASSEMBLY');
  const normalItems   = grn.items.filter(i => i.product.product_type !== 'ASSEMBLY');

  const totalAssemblies = assemblyItems.reduce(
    (sum, i) => sum + i.assemblies.length, 0,
  );
  const needsSetup = assemblyItems.some(
    i => i.assemblies.some(a => a.components.length === 0),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06]">
        <button
          onClick={() => router.push('/inventory/grn')}
          className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white font-mono">{grn.grn_number}</h1>
            <span className={cn(
              'inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border',
              grn.status === 'confirmed'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            )}>
              {grn.status === 'confirmed' ? 'Confirmed' : 'Draft'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{grn.items.length} items · {fmt(grn.total_cost)} total</p>
        </div>
      </div>

      {/* Meta strip */}
      <div className="px-6 py-3 border-b border-white/[0.06] flex items-center gap-8 text-xs flex-wrap">
        {grn.supplier && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Building2 className="size-3.5 text-zinc-600" />
            <span className="font-medium text-white">{grn.supplier.name}</span>
          </div>
        )}
        {grn.invoice_number && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Hash className="size-3.5 text-zinc-600" />
            Invoice: <span className="font-mono text-zinc-300">{grn.invoice_number}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Calendar className="size-3.5 text-zinc-600" />
          Created: <span className="text-zinc-300">{fmtDate(grn.created_at)}</span>
        </div>
        {grn.received_date && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Calendar className="size-3.5 text-zinc-600" />
            Received: <span className="text-zinc-300">{fmtDate(grn.received_date)}</span>
          </div>
        )}
        {grn.notes && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <FileText className="size-3.5 text-zinc-600" />
            <span className="italic">{grn.notes}</span>
          </div>
        )}
      </div>

      {/* Assembly alert */}
      {needsSetup && (
        <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <Wrench className="size-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-400">Assembly Components Not Defined</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Some assembly records need component definitions before they can be dismantled.
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Assembly items section */}
        {assemblyItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="size-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">
                Assembly / Dismantle Items
                <span className="ml-2 text-xs font-normal text-zinc-500">({assemblyItems.length} type{assemblyItems.length !== 1 ? 's' : ''} · {totalAssemblies} records)</span>
              </h2>
            </div>

            <div className="space-y-3">
              {assemblyItems.map(item => (
                <div key={item.id} className="rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-4">
                  {/* Item header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white">{item.product.name}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{item.product.item_code}</p>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <p>Qty: <span className="text-white font-medium">{item.quantity}</span></p>
                      <p>@ <span className="text-white font-medium">{fmt(item.cost_price)}</span></p>
                      <p className="text-amber-400 font-semibold">{fmt(item.total)}</p>
                    </div>
                  </div>

                  {/* Assembly records */}
                  {item.assemblies.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-wider mb-2">
                        Assembly Records
                      </p>
                      {item.assemblies.map(asm => {
                        const hasComponents = asm.components.length > 0;
                        const statusConfig = {
                          intact:   { label: 'Intact',   color: 'sky'     },
                          partial:  { label: 'Partial',  color: 'amber'   },
                          complete: { label: 'Complete', color: 'emerald' },
                        }[asm.status] ?? { label: asm.status, color: 'zinc' };

                        return (
                          <div
                            key={asm.id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.06]"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'size-2 rounded-full flex-shrink-0',
                                statusConfig.color === 'sky'     ? 'bg-sky-400'
                                : statusConfig.color === 'amber' ? 'bg-amber-400'
                                : statusConfig.color === 'emerald' ? 'bg-emerald-400'
                                : 'bg-zinc-500',
                              )} />
                              <div>
                                <p className="text-sm text-white font-mono font-medium">{asm.ref_number}</p>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                  {fmt(asm.purchase_cost)} · {asm.components.length} component{asm.components.length !== 1 ? 's' : ''}
                                  {!hasComponents && <span className="text-amber-400 ml-1">· Setup required</span>}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => router.push(`/inventory/assemblies/${asm.id}`)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                                !hasComponents
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                  : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]',
                              )}
                            >
                              {!hasComponents ? (
                                <><Wrench className="size-3" /> Setup</>
                              ) : (
                                <><ChevronRight className="size-3" /> View</>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">No assembly records</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Normal items */}
        {normalItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Package className="size-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-white">
                Stock Items
                <span className="ml-2 text-xs font-normal text-zinc-500">({normalItems.length})</span>
              </h2>
            </div>

            <div className="rounded-xl border border-white/[0.07] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Item</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cost</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {normalItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{item.product.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{item.product.item_code}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-300">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{fmt(item.cost_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Summary */}
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Total Items</p>
                <p className="font-semibold text-white mt-1">{grn.items.length}</p>
              </div>
              {totalAssemblies > 0 && (
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wider">Assemblies</p>
                  <p className="font-semibold text-amber-400 mt-1">{totalAssemblies}</p>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Grand Total</p>
              <p className="text-2xl font-bold text-white tabular-nums mt-1">{fmt(grn.total_cost)}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
