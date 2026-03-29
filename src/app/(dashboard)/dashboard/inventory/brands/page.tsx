'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Award } from 'lucide-react';
import { useBrands, useDeleteBrand, type Brand } from '@/hooks/inventory/useBrands';
import { BrandModal } from '@/components/inventory/BrandModal';

export const dynamic = 'force-dynamic';

export default function BrandsPage() {
  const { data: brands = [], isLoading } = useBrands();
  const deleteBrand = useDeleteBrand();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | undefined>(undefined);

  function openNew() { setEditing(undefined); setModalOpen(true); }
  function openEdit(b: Brand) { setEditing(b); setModalOpen(true); }
  function closeModal() { setEditing(undefined); setModalOpen(false); }

  function handleDelete(b: Brand) {
    if (!confirm(`Delete brand "${b.name}"?`)) return;
    deleteBrand.mutate(b.id);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
            <Link href="/dashboard/inventory" className="hover:text-zinc-400 transition-colors">Inventory</Link>
            <span>/</span>
            <span className="text-zinc-400">Brands</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="size-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Award className="size-5 text-purple-400" />
            </div>
            Brands
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Manage product brands in your catalogue</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="size-4" />
          New Brand
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-zinc-900/50 border border-white/[0.07] animate-pulse" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 py-20 text-center">
          <Award className="size-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No brands yet</p>
          <button onClick={openNew} className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-sm font-medium transition-colors">
            <Plus className="size-3.5" /> Add Brand
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Brand Name', 'Description', 'Products', 'Actions'].map((h) => (
                  <th key={h} className={`px-5 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {brands.map((brand) => (
                <tr key={brand.id} className="group hover:bg-white/[0.025] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Award className="size-4 text-purple-400" />
                      </div>
                      <span className="font-semibold text-white">{brand.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-zinc-400 text-sm max-w-xs truncate">
                    {brand.description || <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    {brand._count?.products != null ? (
                      <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.06]">
                        {brand._count.products} parts
                      </span>
                    ) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(brand)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => handleDelete(brand)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <BrandModal brand={editing} onClose={closeModal} />}
    </div>
  );
}
