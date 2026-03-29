'use client';

import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStockMovements } from '@/hooks/inventory/useStockMovements';
import { useProducts } from '@/hooks/inventory/useProducts';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 15;

function MovementTypeBadge({ type }: { type: string }) {
  if (type === 'in') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
        <ArrowUpCircle className="size-3" />
        Stock In
      </span>
    );
  }
  if (type === 'out') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/25 text-red-400">
        <ArrowDownCircle className="size-3" />
        Stock Out
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-400">
      <RefreshCw className="size-3" />
      Adjustment
    </span>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function StockMovementTable() {
  const [productFilter, setProductFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: movements = [], isLoading } = useStockMovements(
    productFilter ? { product_id: productFilter } : {},
  );
  const { data: productsData } = useProducts({ limit: 200 });
  const products = productsData?.products ?? [];

  const filtered = typeFilter
    ? movements.filter((m) => m.type === typeFilter)
    : movements;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={productFilter}
          onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all flex-1 max-w-xs"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[160px]"
        >
          <option value="">All Types</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
          <option value="adjustment">Adjustment</option>
        </select>

        <div className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
          <Activity className="size-4" />
          <span>{filtered.length} movements</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Date & Time', 'Product', 'Part #', 'Type', 'Qty', 'Reference', 'Notes'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-zinc-800 rounded-lg w-full max-w-[100px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                : paginated.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="size-14 rounded-2xl bg-zinc-800/60 border border-white/[0.06] flex items-center justify-center">
                            <Activity className="size-6 text-zinc-600" />
                          </div>
                          <p className="text-zinc-400 font-medium">No movements found</p>
                          <p className="text-zinc-600 text-sm">Stock movements will appear here</p>
                        </div>
                      </td>
                    </tr>
                  )
                : paginated.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-white/[0.025] transition-colors duration-150"
                    >
                      <td className="px-4 py-3.5 text-zinc-500 text-xs whitespace-nowrap">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-white font-medium truncate max-w-[180px]">
                          {m.product.name}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-zinc-400 bg-zinc-800/60 px-2 py-1 rounded-lg">
                          {m.product.item_code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <MovementTypeBadge type={m.type} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'font-bold text-sm',
                            m.type === 'in'
                              ? 'text-emerald-400'
                              : m.type === 'out'
                              ? 'text-red-400'
                              : 'text-sky-400'
                          )}
                        >
                          {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '='}
                          {m.quantity}
                        </span>
                        <span className="text-zinc-600 text-xs ml-1">units</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {m.reference ? (
                          <span className="font-mono text-xs text-zinc-400 bg-zinc-800/60 px-2 py-1 rounded-lg">
                            {m.reference}
                          </span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500 text-sm max-w-[200px] truncate">
                        {m.notes || <span className="text-zinc-700">—</span>}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-zinc-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'size-7 rounded-lg text-xs font-medium transition-colors',
                    p === page ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
