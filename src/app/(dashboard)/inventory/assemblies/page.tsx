'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wrench, Plus, Search, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, ChevronRight, Trash2, Package, BarChart3, Scissors,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import {
  useAssemblies, useDeleteAssembly, getAssemblyProgress,
  type Assembly, type AssemblyStatus,
} from '@/hooks/inventory/useAssemblies';
import { AssemblyBreakdownModal } from '@/components/inventory/AssemblyBreakdownModal';

export const dynamic = 'force-dynamic';

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<AssemblyStatus, { label: string; color: string; icon: React.ElementType }> = {
  intact:   { label: 'Intact',    color: 'sky',     icon: Package },
  partial:  { label: 'Partial',   color: 'amber',   icon: Wrench  },
  complete: { label: 'Complete',  color: 'emerald', icon: CheckCircle2 },
};

export default function AssembliesPage() {
  const router = useRouter();
  const { fmt } = useCurrency();
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [breakdownId, setBreakdownId] = useState<string | null>(null);

  const { data: assemblies = [], isLoading, refetch } = useAssemblies({
    q:      search,
    status: statusFilter || undefined,
  });

  const breakdownAssembly = assemblies.find(a => a.id === breakdownId) ?? null;

  const deleteAssembly = useDeleteAssembly();

  const handleDelete = async (id: string) => {
    try {
      await deleteAssembly.mutateAsync(id);
      setDeleteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const statusCounts = {
    intact:   assemblies.filter(a => a.status === 'intact').length,
    partial:  assemblies.filter(a => a.status === 'partial').length,
    complete: assemblies.filter(a => a.status === 'complete').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Wrench className="size-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Assemblies & Dismantling</h1>
            <p className="text-xs text-zinc-500">Track engines, half-cuts, and component extractions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="size-9 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <RefreshCw className="size-4" />
          </button>
          <Link
            href="/inventory/assemblies/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all"
          >
            <Plus className="size-4" />
            New Assembly
          </Link>
        </div>
      </div>

      {/* Summary strip */}
      <div className="px-6 py-3 border-b border-white/[0.06] flex items-center gap-4">
        {([
          { key: '',         label: 'All',      count: assemblies.length, color: 'zinc'    },
          { key: 'intact',   label: 'Intact',   count: statusCounts.intact,   color: 'sky'     },
          { key: 'partial',  label: 'Partial',  count: statusCounts.partial,  color: 'amber'   },
          { key: 'complete', label: 'Complete', count: statusCounts.complete, color: 'emerald' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
              statusFilter === f.key
                ? f.color === 'sky'     ? 'border-sky-500/50 bg-sky-500/10 text-sky-400'
                : f.color === 'amber'   ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                : f.color === 'emerald' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-white/20 bg-white/10 text-white'
                : 'border-white/[0.07] bg-transparent text-zinc-500 hover:border-white/20 hover:text-zinc-300',
            )}
          >
            <span className="font-bold tabular-nums">{f.count}</span>
            {f.label}
          </button>
        ))}

        {/* Search */}
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] w-56">
          <Search className="size-3.5 text-zinc-500 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assemblies…"
            className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-zinc-500">
            <RefreshCw className="size-6 animate-spin mr-2" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : assemblies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="size-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <Wrench className="size-8 text-zinc-700" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">No assemblies found</p>
              <p className="text-sm text-zinc-500 mt-1">Create your first assembly to start dismantling</p>
            </div>
            <Link
              href="/inventory/assemblies/new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all"
            >
              <Plus className="size-4" />
              New Assembly
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {assemblies.map(assembly => (
              <AssemblyCard
                key={assembly.id}
                assembly={assembly}
                fmt={fmt}
                onOpen={() => router.push(`/inventory/assemblies/${assembly.id}`)}
                onDelete={() => setDeleteId(assembly.id)}
                onBreakdown={() => setBreakdownId(assembly.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Breakdown modal */}
      {breakdownAssembly && (
        <AssemblyBreakdownModal
          assembly={breakdownAssembly}
          onClose={() => setBreakdownId(null)}
          onDone={() => setBreakdownId(null)}
        />
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="size-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Delete Assembly?</p>
                <p className="text-xs text-zinc-500 mt-0.5">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              Assemblies with extraction history cannot be deleted. This only removes assemblies with no extractions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-zinc-300 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteAssembly.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-60"
              >
                {deleteAssembly.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assembly Card ──────────────────────────────────────────────────────────
function AssemblyCard({
  assembly, fmt, onOpen, onDelete, onBreakdown,
}: {
  assembly:    Assembly;
  fmt:         (n: number) => string;
  onOpen:      () => void;
  onDelete:    () => void;
  onBreakdown: () => void;
}) {
  const { label, color, icon: Icon } = STATUS_CONFIG[assembly.status];
  const { totalUnits, extractedUnits, pct } = getAssemblyProgress(assembly.components);

  return (
    <div
      onClick={onOpen}
      className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] p-5 cursor-pointer transition-all"
    >
      {/* Status badge */}
      <div className={cn(
        'absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border',
        color === 'sky'     ? 'border-sky-500/20 bg-sky-500/10 text-sky-400'
        : color === 'amber' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
      )}>
        <Icon className="size-3" />
        {label}
      </div>

      {/* Product info */}
      <div className="pr-20 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs text-zinc-500 font-mono">{assembly.product.item_code}</p>
          {assembly.ref_number && (
            <span className="text-[10px] font-mono font-bold text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
              {assembly.ref_number}
            </span>
          )}
        </div>
        <p className="text-base font-semibold text-white leading-tight">{assembly.product.name}</p>
        {assembly.reference && (
          <p className="text-xs text-zinc-400 mt-0.5">↳ {assembly.reference}</p>
        )}
      </div>

      {/* Progress bar */}
      {assembly.components.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
            <span>{extractedUnits} of {totalUnits} units extracted</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-zinc-600',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">
            {assembly.components.length} component type{assembly.components.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Cost */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Purchase Cost</p>
          <p className="text-sm font-bold text-white">{fmt(assembly.purchase_cost)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Quick breakdown button — only for non-complete assemblies with components */}
          {assembly.status !== 'complete' && (assembly.components?.length ?? 0) > 0 && (
            <button
              onClick={e => { e.stopPropagation(); onBreakdown(); }}
              title="Partial Breakdown"
              className="size-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-orange-400 hover:bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Scissors className="size-3.5" />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="size-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="size-3.5" />
          </button>
          <div className="size-7 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-white transition-all">
            <ChevronRight className="size-4" />
          </div>
        </div>
      </div>

      {/* Logs count */}
      {(assembly._count?.dismantle_logs ?? 0) > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-1.5 text-[10px] text-zinc-600">
          <BarChart3 className="size-3" />
          {assembly._count?.dismantle_logs} extraction event{(assembly._count?.dismantle_logs ?? 0) !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
