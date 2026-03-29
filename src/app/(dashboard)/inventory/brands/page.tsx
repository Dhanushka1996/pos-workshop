'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, Award, RefreshCw,
} from 'lucide-react';
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from '@/hooks/inventory/useBrands';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface BrandRow {
  id:           string;
  name:         string;
  description?: string | null;
  _count?:      { products: number };
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white shadow-2xl">
      {msg}
    </div>
  );
}

export default function BrandsPage() {
  const [search,      setSearch]      = useState('');
  const [showAdd,     setShowAdd]     = useState(false);
  const [editTarget,  setEditTarget]  = useState<BrandRow | null>(null);
  const [deleteTarget,setDeleteTarget]= useState<BrandRow | null>(null);
  const [form,        setForm]        = useState({ name: '', description: '' });
  const [toast,       setToast]       = useState<string | null>(null);

  const { data, isLoading, refetch } = useBrands();
  const createBrand  = useCreateBrand();
  const updateBrand  = useUpdateBrand();
  const deleteBrand  = useDeleteBrand();

  const brands: BrandRow[] = data ?? [];
  const filtered = search.trim()
    ? brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : brands;

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const resetForm = () => setForm({ name: '', description: '' });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    try {
      await createBrand.mutateAsync({ name: form.name.trim(), description: form.description || undefined });
      resetForm();
      setShowAdd(false);
      showToast('Brand created');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleUpdate = async () => {
    if (!editTarget || !form.name.trim()) return;
    try {
      await updateBrand.mutateAsync({ id: editTarget.id, data: { name: form.name.trim(), description: form.description || undefined } });
      setEditTarget(null);
      resetForm();
      showToast('Brand updated');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBrand.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Brand deleted');
    } catch (e: unknown) {
      setDeleteTarget(null);
      showToast(e instanceof Error ? e.message : 'Error');
    }
  };

  const openEdit = (b: BrandRow) => {
    setEditTarget(b);
    setForm({ name: b.name, description: b.description ?? '' });
  };

  const FormFields = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Brand Name <span className="text-red-400">*</span></label>
        <input
          autoFocus
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && (editTarget ? handleUpdate() : handleAdd())}
          placeholder="e.g. Toyota, Bosch"
          className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Description</label>
        <input
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Optional short description"
          className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 z-10 bg-zinc-950/80">
        <div>
          <h1 className="text-lg font-semibold text-white">Brands</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{brands.length} brands</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw className="size-4" />
          </button>
          <button
            onClick={() => { resetForm(); setShowAdd(true); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all"
          >
            <Plus className="size-4" />Add Brand
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-white/[0.06]">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search brands…"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-white/[0.06]">
              <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-[40%]">Brand</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Items</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-white/5 rounded" /></td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center">
                      <Award className="size-10 text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500 text-sm">No brands yet</p>
                    </td>
                  </tr>
                )
                : filtered.map(brand => (
                  <tr key={brand.id} className="group hover:bg-white/[0.025] transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 flex-shrink-0">
                          <Award className="size-4" />
                        </div>
                        <span className="font-medium text-white">{brand.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-sm">{brand.description ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-zinc-400">{brand._count?.products ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(brand)}
                          className="size-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(brand)}
                          className="size-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New Brand"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all">Cancel</button>
            <button onClick={handleAdd} disabled={createBrand.isPending || !form.name.trim()} className="px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all disabled:opacity-50">
              {createBrand.isPending ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <FormFields />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => { setEditTarget(null); resetForm(); }}
        title="Edit Brand"
        size="sm"
        footer={
          <>
            <button onClick={() => { setEditTarget(null); resetForm(); }} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all">Cancel</button>
            <button onClick={handleUpdate} disabled={updateBrand.isPending || !form.name.trim()} className="px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all disabled:opacity-50">
              {updateBrand.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        <FormFields />
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Brand"
        size="sm"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all">Cancel</button>
            <button onClick={handleDelete} disabled={deleteBrand.isPending} className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium transition-all disabled:opacity-50">
              {deleteBrand.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-zinc-400 text-sm">
          Delete brand <strong className="text-white">"{deleteTarget?.name}"</strong>?
          {(deleteTarget?._count?.products ?? 0) > 0 && (
            <span className="text-amber-400"> This brand is used by {deleteTarget?._count?.products} product(s).</span>
          )}
        </p>
      </Modal>
    </div>
  );
}
