'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Scissors, Search, Package, ArrowDownCircle, ArrowUpCircle, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDisassemblies, getDisassemblySummary } from '@/hooks/inventory/useDisassembly';
import { useCurrency } from '@/hooks/useCurrency';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DisassemblyListPage() {
  const { fmt } = useCurrency();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, isLoading } = useDisassemblies({ q: debouncedSearch || undefined, limit: 30 });
  const records = data?.records ?? [];

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t);
    (handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => setDebouncedSearch(v), 300,
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
            <Link href="/dashboard/inventory" className="hover:text-zinc-400 transition-colors">Inventory</Link>
            <span>/</span>
            <span className="text-zinc-400">Disassembly</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="size-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Scissors className="size-5 text-rose-400" />
            </div>
            Disassembly Records
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Break items into components and recover parts to inventory</p>
        </div>

        <Link
          href="/inventory/disassembly/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-rose-500/20"
        >
          <Plus className="size-4" />
          New Disassembly
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by DSM ref or item name…"
          className="w-full pl-9 pr-4 h-10 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/10 transition-all"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-900/50 border border-white/[0.07] animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 py-24 text-center">
          <div className="size-16 rounded-2xl bg-zinc-800/60 border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Scissors className="size-7 text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-semibold text-lg">
            {debouncedSearch ? 'No records match your search' : 'No disassembly records yet'}
          </p>
          <p className="text-zinc-600 text-sm mt-1">
            {debouncedSearch
              ? 'Try a different reference number or item name'
              : 'Disassemble a product to recover components into inventory'}
          </p>
          {!debouncedSearch && (
            <Link
              href="/inventory/disassembly/new"
              className="mt-5 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm font-medium transition-colors"
            >
              <Plus className="size-3.5" /> Start Disassembly
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Reference', 'Parent Item', 'Qty', 'Components', 'Recovered', 'Skipped', 'Date'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {records.map(rec => {
                const summary = getDisassemblySummary(rec.components ?? []);
                return (
                  <tr key={rec.id} className="group hover:bg-white/[0.025] transition-colors">
                    {/* Reference */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/inventory/disassembly/${rec.id}`}
                        className="inline-flex items-center gap-1.5"
                      >
                        <div className="size-7 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                          <Hash className="size-3.5 text-rose-400" />
                        </div>
                        <span className="font-mono text-sm font-bold text-rose-300 group-hover:text-rose-200 transition-colors">
                          {rec.ref_number}
                        </span>
                      </Link>
                    </td>

                    {/* Parent Item */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                          <Package className="size-4 text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-white font-medium leading-tight">{rec.product.name}</p>
                          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{rec.product.item_code}</p>
                        </div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        <ArrowDownCircle className="size-3" />
                        ×{rec.quantity}
                      </span>
                    </td>

                    {/* Component count */}
                    <td className="px-5 py-4 text-zinc-400 text-sm">
                      {rec._count?.components ?? rec.components?.length ?? 0} parts
                    </td>

                    {/* Recovered */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        <ArrowUpCircle className="size-3" />
                        {summary.recovered.length} to stock
                      </span>
                    </td>

                    {/* Skipped */}
                    <td className="px-5 py-4">
                      {summary.skipped.length > 0 ? (
                        <span className="text-[11px] text-zinc-500">
                          {summary.skipped.length} skipped
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-700">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-zinc-500 text-xs whitespace-nowrap">
                      {timeAgo(rec.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data && data.total > data.limit && (
            <div className="px-5 py-3 border-t border-white/[0.06] text-xs text-zinc-500">
              Showing {records.length} of {data.total} records
            </div>
          )}
        </div>
      )}
    </div>
  );
}
