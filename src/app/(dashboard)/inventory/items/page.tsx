'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, RefreshCw, Edit2, Trash2,
  Package, MoreHorizontal, Copy, Wrench,
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  useProducts, useDeleteProduct, useDuplicateProduct, type ProductFilters,
} from '@/hooks/inventory/useProducts';
import { useCategories } from '@/hooks/inventory/useCategories';
import { useBrands } from '@/hooks/inventory/useBrands';
import { StockBadge } from '@/components/inventory/StockBadge';
import { Modal } from '@/components/ui/Modal';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import type { ProductType } from '@/types/inventory';

const STATUS_OPTIONS = [
  { value: '',             label: 'All Status' },
  { value: 'active',       label: 'Active' },
  { value: 'inactive',     label: 'Inactive' },
  { value: 'low_stock',    label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

const TYPE_OPTIONS = [
  { value: '',         label: 'All Types'  },
  { value: 'NORMAL',   label: 'Normal'     },
  { value: 'ASSEMBLY', label: 'Assembly'   },
];

type SortField = 'name' | 'item_code' | 'retail_price' | 'cost_price' | 'current_stock' | 'created_at';

const PAGE_SIZE = 50;

// ─── Sort indicator icon ──────────────────────────────────────────────────────
function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="size-3 text-zinc-700 ml-1 inline-block" />;
  return dir === 'asc'
    ? <ChevronUp   className="size-3 text-brand-400 ml-1 inline-block" />
    : <ChevronDown className="size-3 text-brand-400 ml-1 inline-block" />;
}

export default function ItemsPage() {
  const router     = useRouter();
  const searchRef  = useRef<HTMLInputElement>(null);
  const { fmt }    = useCurrency();

  const [filters,      setFilters]      = useState<ProductFilters>({ page: 1, limit: PAGE_SIZE, sortBy: 'name', sortDir: 'asc' });
  const [search,       setSearch]       = useState('');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [deleteId,     setDeleteId]     = useState<string | null>(null);
  const [duplicateId,  setDuplicateId]  = useState<string | null>(null);
  const [openMenuId,   setOpenMenuId]   = useState<string | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);

  const { data, isLoading, refetch }    = useProducts(filters);
  const { data: categories }            = useCategories();
  const { data: brands }                = useBrands();
  const deleteMutation                  = useDeleteProduct();
  const duplicateMutation               = useDuplicateProduct();

  const products: ProductType[] = (data?.products ?? []) as unknown as ProductType[];
  const total:    number        = data?.total      ?? 0;
  const pages:    number        = data?.totalPages ?? 1;
  const page:     number        = filters.page   ?? 1;

  // Toast helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, search, page: 1 })), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'F1')  { e.preventDefault(); router.push('/inventory/items/new'); }
      if (e.key === 'F3')  { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F5')  { e.preventDefault(); refetch(); }
      if (e.key === 'F2' && selectedId) {
        e.preventDefault();
        router.push(`/inventory/items/${selectedId}/edit`);
      }
      if (e.key === 'F4' && selectedId) {
        e.preventDefault();
        setDuplicateId(selectedId);
      }
      if ((e.key === 'Delete' || e.key === 'Del') && selectedId) {
        e.preventDefault();
        setDeleteId(selectedId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, refetch, selectedId]);

  // Sort click
  const handleSort = (field: SortField) => {
    setFilters(f => ({
      ...f,
      sortBy:  field,
      sortDir: f.sortBy === field && f.sortDir === 'asc' ? 'desc' : 'asc',
      page:    1,
    }));
  };

  // Delete
  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    if (selectedId === deleteId) setSelectedId(null);
    setDeleteId(null);
    showToast('Item deleted.');
  }, [deleteId, deleteMutation, selectedId]);

  // Duplicate
  const handleDuplicate = useCallback(async () => {
    if (!duplicateId) return;
    const result = await duplicateMutation.mutateAsync(duplicateId);
    setDuplicateId(null);
    showToast(`Duplicated as "${result.name}" (${result.item_code})`);
  }, [duplicateId, duplicateMutation]);

  // Sortable TH
  const Th = ({
    label, field, align = 'left', className,
  }: {
    label: string; field: SortField; align?: 'left' | 'right'; className?: string;
  }) => (
    <th
      onClick={() => handleSort(field)}
      className={cn(
        'px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer select-none hover:text-zinc-300 transition-colors',
        align === 'right' ? 'text-right' : 'text-left',
        filters.sortBy === field && 'text-brand-400',
        className,
      )}
    >
      {label}
      <SortIcon field={field} active={filters.sortBy === field} dir={filters.sortDir ?? 'asc'} />
    </th>
  );

  return (
    <div className="flex flex-col h-full relative">

      {/* ── Toast ── */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-zinc-950/50 sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-semibold text-white">Item Master</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {total} items · F1 New · F2 Edit · F4 Duplicate · Del Delete · F3 Search · F5 Refresh
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            title="Refresh (F5)"
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            onClick={() => router.push('/inventory/items/new')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all"
          >
            <Plus className="size-4" />
            Add Item
            <span className="text-brand-300 text-xs ml-0.5">F1</span>
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-white/[0.06] bg-zinc-950/30">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, code, barcode…  F3"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
          />
        </div>

        <select
          value={filters.category_id ?? ''}
          onChange={e => setFilters(f => ({ ...f, category_id: e.target.value, page: 1 }))}
          className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
        >
          <option value="">All Categories</option>
          {(categories ?? []).map((c: { id: string; name: string }) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filters.brand_id ?? ''}
          onChange={e => setFilters(f => ({ ...f, brand_id: e.target.value, page: 1 }))}
          className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
        >
          <option value="">All Brands</option>
          {(brands ?? []).map((b: { id: string; name: string }) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={filters.status ?? ''}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
          className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filters.product_type ?? ''}
          onChange={e => setFilters(f => ({ ...f, product_type: e.target.value, page: 1 }))}
          className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
        >
          {TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {(filters.search || filters.category_id || filters.brand_id || filters.status || filters.product_type) && (
          <button
            onClick={() => { setSearch(''); setFilters({ page: 1, limit: PAGE_SIZE, sortBy: 'name', sortDir: 'asc', product_type: '' }); }}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-zinc-900/90 backdrop-blur border-b border-white/[0.06]">
              <Th label="Item"          field="name"          className="w-[32%]" />
              <Th label="Code"          field="item_code" />
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
              <Th label="Cost"          field="cost_price"    align="right" />
              <Th label="Retail"        field="retail_price"  align="right" />
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Wholesale</th>
              <Th label="Stock"         field="current_stock" align="right" />
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/5 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : products.length === 0
                ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <Package className="size-10 text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500 text-sm">No items found</p>
                      <button
                        onClick={() => router.push('/inventory/items/new')}
                        className="mt-3 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        Add your first item →
                      </button>
                    </td>
                  </tr>
                )
                : products.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                    onDoubleClick={() => router.push(`/inventory/items/${p.id}/edit`)}
                    className={cn(
                      'group transition-colors cursor-pointer',
                      selectedId === p.id
                        ? 'bg-brand-500/[0.08] border-l-2 border-brand-500'
                        : 'hover:bg-white/[0.03]',
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'size-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          (p as { product_type?: string }).product_type === 'ASSEMBLY'
                            ? 'bg-amber-500/10'
                            : 'bg-brand-500/10',
                        )}>
                          {(p as { product_type?: string }).product_type === 'ASSEMBLY'
                            ? <Wrench className="size-4 text-amber-400" />
                            : <Package className="size-4 text-brand-400" />
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white text-sm leading-tight truncate">{p.name}</p>
                            {(p as { product_type?: string }).product_type === 'ASSEMBLY' && (
                              <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Assembly
                              </span>
                            )}
                          </div>
                          {p.brand && <p className="text-[11px] text-zinc-500 mt-0.5">{p.brand.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{p.item_code}</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{p.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-300">{fmt(p.cost_price)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{fmt(p.retail_price)}</td>
                    <td className="px-4 py-3 text-right text-zinc-400">{fmt(p.wholesale_price)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'font-semibold tabular-nums',
                        p.current_stock <= 0
                          ? 'text-red-400'
                          : p.current_stock <= p.reorder_level
                            ? 'text-amber-400'
                            : 'text-white',
                      )}>
                        {p.current_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge current={p.current_stock} reorderLevel={p.reorder_level} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id); }}
                          className="size-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                        {openMenuId === p.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/10 bg-zinc-900 shadow-2xl overflow-hidden z-30">
                              <button
                                onClick={() => { setOpenMenuId(null); router.push(`/inventory/items/${p.id}/edit`); }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
                              >
                                <Edit2 className="size-3.5" />
                                Edit
                                <span className="ml-auto text-zinc-600 text-xs">F2</span>
                              </button>
                              <button
                                onClick={() => { setOpenMenuId(null); setDuplicateId(p.id); }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
                              >
                                <Copy className="size-3.5" />
                                Duplicate
                                <span className="ml-auto text-zinc-600 text-xs">F4</span>
                              </button>
                              <div className="h-px bg-white/[0.06] mx-2" />
                              <button
                                onClick={() => { setOpenMenuId(null); setDeleteId(p.id); }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="size-3.5" />
                                Delete
                                <span className="ml-auto text-red-600 text-xs">Del</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* ── Pagination + Status bar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06] bg-zinc-950/80">
        {/* Keyboard hints */}
        <div className="flex items-center gap-4 text-xs text-zinc-600">
          {[
            ['F1', 'New'],
            ['F2', 'Edit'],
            ['F4', 'Duplicate'],
            ['Del', 'Delete'],
            ['F3', 'Search'],
            ['F5', 'Refresh'],
          ].map(([key, action]) => (
            <span key={key}>
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-500 font-mono mr-1">{key}</kbd>
              {action}
            </span>
          ))}
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600">
            {total === 0 ? '0' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)}`} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
              className="size-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
              const p2 = pages <= 7
                ? i + 1
                : page <= 4
                  ? i + 1
                  : page >= pages - 3
                    ? pages - 6 + i
                    : page - 3 + i;
              return (
                <button
                  key={p2}
                  onClick={() => setFilters(f => ({ ...f, page: p2 }))}
                  className={cn(
                    'size-7 rounded-lg text-xs font-medium transition-all',
                    page === p2
                      ? 'bg-brand-600 text-white'
                      : 'text-zinc-500 hover:text-white hover:bg-white/10',
                  )}
                >
                  {p2}
                </button>
              );
            })}

            <button
              disabled={page >= pages}
              onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
              className="size-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Item"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium transition-all disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-zinc-400 text-sm">
          This will permanently delete the item and all its stock history. This cannot be undone.
        </p>
      </Modal>

      {/* ── Duplicate Confirm Modal ── */}
      <Modal
        open={!!duplicateId}
        onClose={() => setDuplicateId(null)}
        title="Duplicate Item"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setDuplicateId(null)}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDuplicate}
              disabled={duplicateMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all disabled:opacity-50"
            >
              {duplicateMutation.isPending ? 'Duplicating…' : 'Duplicate'}
            </button>
          </>
        }
      >
        <p className="text-zinc-400 text-sm">
          A copy of this item will be created with a new item code and <strong className="text-white">zero stock</strong>.
          You can then edit pricing and details.
        </p>
      </Modal>
    </div>
  );
}
