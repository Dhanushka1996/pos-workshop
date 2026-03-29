'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, FileText, ChevronRight, Search } from 'lucide-react';
import { useGRNs } from '@/hooks/inventory/useStockMovements';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function GRNListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useGRNs(page);
  const { fmt } = useCurrency();

  const grns   = data?.grns   ?? [];
  const total  = data?.total  ?? 0;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-semibold text-white">Goods Received Notes</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{total} GRN records</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw className="size-4" />
          </button>
          <button
            onClick={() => router.push('/inventory/grn/new')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all"
          >
            <Plus className="size-4" />New GRN
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0">
            <tr className="bg-zinc-900/90 backdrop-blur border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">GRN #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Supplier</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Items</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Cost</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-white/5 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : grns.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <FileText className="size-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No GRNs yet</p>
                  <button onClick={() => router.push('/inventory/grn/new')} className="mt-3 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                    Create your first GRN →
                  </button>
                </td>
              </tr>
            ) : (
              grns.map((grn: {
                id: string;
                grn_number: string;
                created_at: string;
                supplier?: { name: string };
                items: unknown[];
                total_cost: number;
                status: string;
              }) => (
                <tr
                  key={grn.id}
                  onClick={() => router.push(`/inventory/grn/${grn.id}`)}
                  className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-sm font-medium text-brand-400">{grn.grn_number}</td>
                  <td className="px-4 py-3 text-zinc-400">{fmtDate(grn.created_at)}</td>
                  <td className="px-4 py-3 text-zinc-300">{grn.supplier?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">{grn.items.length} items</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{fmt(grn.total_cost)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-medium border',
                      grn.status === 'confirmed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    )}>
                      {grn.status === 'confirmed' ? 'Confirmed' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="size-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
