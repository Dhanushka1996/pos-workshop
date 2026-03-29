'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Layers, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategories, useDeleteCategory } from '@/hooks/inventory/useCategories';
import { CategoryModal } from '@/components/inventory/CategoryModal';
import type { Category } from '@/hooks/inventory/useCategories';

export const dynamic = 'force-dynamic';

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);

  function openNew() { setEditing(undefined); setModalOpen(true); }
  function openEdit(cat: Category) { setEditing(cat); setModalOpen(true); }
  function closeModal() { setEditing(undefined); setModalOpen(false); }

  function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    deleteCategory.mutate(cat.id);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
            <Link href="/dashboard/inventory" className="hover:text-zinc-400 transition-colors">Inventory</Link>
            <span>/</span>
            <span className="text-zinc-400">Categories</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="size-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Layers className="size-5 text-amber-400" />
            </div>
            Categories
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Organise your parts by category</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="size-4" />
          New Category
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-zinc-900/50 border border-white/[0.07] animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 py-20 text-center">
          <div className="size-14 rounded-2xl bg-zinc-800/60 border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Layers className="size-6 text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">No categories yet</p>
          <p className="text-zinc-600 text-sm mt-1">Create your first category to organise parts</p>
          <button
            onClick={openNew}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-sm font-medium transition-colors"
          >
            <Plus className="size-3.5" />
            Add Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="group relative rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-5 hover:border-white/15 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="size-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${cat.color ?? '#6366f1'}15`, border: `1px solid ${cat.color ?? '#6366f1'}30` }}
                >
                  <Tag className="size-5" style={{ color: cat.color ?? '#6366f1' }} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <p className="font-semibold text-white text-sm">{cat.name}</p>
              {cat.description && (
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{cat.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: cat.color ?? '#6366f1' }}
                />
                <span className="text-xs text-zinc-600 font-mono">{cat.color}</span>
                {cat._count?.products != null && (
                  <span className="ml-auto text-xs text-zinc-500">{cat._count.products} parts</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <CategoryModal category={editing} onClose={closeModal} />}
    </div>
  );
}
