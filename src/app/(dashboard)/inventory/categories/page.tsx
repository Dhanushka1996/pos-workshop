'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, ChevronRight, ChevronDown,
  Tag, Layers, RefreshCw, X, Check, Loader2,
} from 'lucide-react';
import {
  useCategories,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateSubCategory, useUpdateSubCategory, useDeleteSubCategory,
} from '@/hooks/inventory/useCategories';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { CategoryType, SubCategoryType } from '@/types/inventory';

export const dynamic = 'force-dynamic';

const COLOR_PRESETS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
  '#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4',
];

// ── Inline edit field ──────────────────────────────────────────────────────────
function InlineEdit({
  value, onSave, onCancel, placeholder,
}: { value: string; onSave: (v: string) => void; onCancel: () => void; placeholder?: string }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={ref}
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(v); if (e.key === 'Escape') onCancel(); }}
        placeholder={placeholder}
        className="flex-1 px-2 py-1 rounded-lg bg-white/[0.06] border border-brand-500/50 text-sm text-white focus:outline-none"
      />
      <button type="button" onClick={() => onSave(v)} className="size-6 flex items-center justify-center rounded text-emerald-400 hover:bg-emerald-400/10 transition-all"><Check className="size-3.5" /></button>
      <button type="button" onClick={onCancel}        className="size-6 flex items-center justify-center rounded text-zinc-500 hover:bg-white/10 transition-all"><X className="size-3.5" /></button>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white shadow-2xl">
      {msg}
    </div>
  );
}

export default function CategoriesPage() {
  const [search,      setSearch]      = useState('');
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set());
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editingSubId,setEditingSubId]= useState<string | null>(null);
  const [deleteTarget,setDeleteTarget]= useState<{ type: 'cat'|'sub'; id: string; name: string } | null>(null);
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [newSubName,  setNewSubName]  = useState('');
  const [showAdd,     setShowAdd]     = useState(false);
  const [newCat,      setNewCat]      = useState({ name: '', color: '#6366f1' });
  const [toast,       setToast]       = useState<string | null>(null);

  const { data, isLoading, refetch } = useCategories();
  const createCat    = useCreateCategory();
  const updateCat    = useUpdateCategory();
  const deleteCat    = useDeleteCategory();
  const createSub    = useCreateSubCategory();
  const updateSub    = useUpdateSubCategory();
  const deleteSub    = useDeleteSubCategory();

  const categories: (CategoryType & { _count?: { products: number } })[] = (data ?? []) as unknown as (CategoryType & { _count?: { products: number } })[];

  const filtered = search.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories;

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const toggle = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Add category ──
  const handleAddCategory = async () => {
    if (!newCat.name.trim()) return;
    try {
      await createCat.mutateAsync({ name: newCat.name.trim(), color: newCat.color });
      setNewCat({ name: '', color: '#6366f1' });
      setShowAdd(false);
      showToast('Category created');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error');
    }
  };

  // ── Rename category ──
  const handleRenameCategory = async (id: string, name: string) => {
    if (!name.trim()) { setEditingId(null); return; }
    try {
      await updateCat.mutateAsync({ id, data: { name: name.trim() } });
      setEditingId(null);
      showToast('Category renamed');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error');
    }
  };

  // ── Delete category ──
  const handleDeleteCategory = async () => {
    if (!deleteTarget || deleteTarget.type !== 'cat') return;
    try {
      await deleteCat.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Category deleted');
    } catch (e: unknown) {
      setDeleteTarget(null);
      showToast(e instanceof Error ? e.message : 'Error');
    }
  };

  // ── Add sub-category ──
  const handleAddSub = async (categoryId: string) => {
    if (!newSubName.trim()) return;
    try {
      await createSub.mutateAsync({ name: newSubName.trim(), category_id: categoryId });
      setNewSubName('');
      setAddingSubTo(null);
      showToast('Sub-category created');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error');
    }
  };

  // ── Rename sub-category ──
  const handleRenameSub = async (id: string, name: string) => {
    if (!name.trim()) { setEditingSubId(null); return; }
    try {
      await updateSub.mutateAsync({ id, name: name.trim() });
      setEditingSubId(null);
      showToast('Sub-category renamed');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error');
    }
  };

  // ── Delete sub-category ──
  const handleDeleteSub = async () => {
    if (!deleteTarget || deleteTarget.type !== 'sub') return;
    try {
      await deleteSub.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Sub-category deleted');
    } catch (e: unknown) {
      setDeleteTarget(null);
      showToast(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 z-10 bg-zinc-950/80">
        <div>
          <h1 className="text-lg font-semibold text-white">Categories</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{categories.length} categories</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw className="size-4" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all"
          >
            <Plus className="size-4" />Add Category
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
            placeholder="Search categories…"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
            ))
          : filtered.length === 0
            ? (
              <div className="text-center py-16">
                <Tag className="size-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No categories yet</p>
                <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Create your first category →
                </button>
              </div>
            )
            : filtered.map(cat => (
              <div key={cat.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                {/* Category row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggle(cat.id)}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {expanded.has(cat.id)
                      ? <ChevronDown className="size-4" />
                      : <ChevronRight className="size-4" />
                    }
                  </button>

                  <span
                    className="size-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color ?? '#6366f1' }}
                  />

                  {editingId === cat.id
                    ? (
                      <div className="flex-1">
                        <InlineEdit
                          value={cat.name}
                          onSave={v => handleRenameCategory(cat.id, v)}
                          onCancel={() => setEditingId(null)}
                          placeholder="Category name"
                        />
                      </div>
                    )
                    : (
                      <span
                        className="flex-1 text-sm font-medium text-white cursor-pointer"
                        onDoubleClick={() => setEditingId(cat.id)}
                      >
                        {cat.name}
                      </span>
                    )
                  }

                  <span className="text-xs text-zinc-600">
                    {cat.sub_categories?.length ?? 0} sub · {(cat as CategoryType & { _count?: { products: number } })._count?.products ?? 0} items
                  </span>

                  <button
                    onClick={() => setEditingId(cat.id)}
                    className="size-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-all"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: 'cat', id: cat.id, name: cat.name })}
                    className="size-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {/* Subcategories */}
                {expanded.has(cat.id) && (
                  <div className="border-t border-white/[0.06] bg-zinc-950/30 px-4 py-2 space-y-1">
                    {(cat.sub_categories ?? []).map((sub: SubCategoryType) => (
                      <div key={sub.id} className="flex items-center gap-2 pl-7 py-1.5">
                        <Layers className="size-3 text-zinc-600 flex-shrink-0" />
                        {editingSubId === sub.id
                          ? (
                            <div className="flex-1">
                              <InlineEdit
                                value={sub.name}
                                onSave={v => handleRenameSub(sub.id, v)}
                                onCancel={() => setEditingSubId(null)}
                                placeholder="Sub-category name"
                              />
                            </div>
                          )
                          : (
                            <span
                              className="flex-1 text-sm text-zinc-300 cursor-pointer"
                              onDoubleClick={() => setEditingSubId(sub.id)}
                            >
                              {sub.name}
                            </span>
                          )
                        }
                        <button onClick={() => setEditingSubId(sub.id)} className="size-6 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-all">
                          <Edit2 className="size-3" />
                        </button>
                        <button onClick={() => setDeleteTarget({ type: 'sub', id: sub.id, name: sub.name })} className="size-6 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}

                    {/* Add sub-category inline */}
                    {addingSubTo === cat.id
                      ? (
                        <div className="pl-7 pt-1">
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={newSubName}
                              onChange={e => setNewSubName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleAddSub(cat.id);
                                if (e.key === 'Escape') { setAddingSubTo(null); setNewSubName(''); }
                              }}
                              placeholder="New sub-category name…"
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
                            />
                            <button
                              onClick={() => handleAddSub(cat.id)}
                              disabled={createSub.isPending}
                              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs transition-all disabled:opacity-50"
                            >
                              {createSub.isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Add'}
                            </button>
                            <button onClick={() => { setAddingSubTo(null); setNewSubName(''); }} className="size-7 flex items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                      : (
                        <button
                          onClick={() => { setAddingSubTo(cat.id); setNewSubName(''); }}
                          className="flex items-center gap-1.5 pl-7 py-1 text-xs text-zinc-600 hover:text-brand-400 transition-colors"
                        >
                          <Plus className="size-3" />Add sub-category
                        </button>
                      )
                    }
                  </div>
                )}
              </div>
            ))
        }
      </div>

      {/* ── Add Category Modal ── */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setNewCat({ name: '', color: '#6366f1' }); }}
        title="New Category"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
              Cancel
            </button>
            <button
              onClick={handleAddCategory}
              disabled={createCat.isPending || !newCat.name.trim()}
              className="px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all disabled:opacity-50"
            >
              {createCat.isPending ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Name <span className="text-red-400">*</span></label>
            <input
              autoFocus
              value={newCat.name}
              onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              placeholder="e.g. Engine Parts"
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Color</label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewCat(p => ({ ...p, color: c }))}
                  className={cn('size-6 rounded-full transition-all', newCat.color === c && 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type === 'cat' ? 'Category' : 'Sub-Category'}`}
        size="sm"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
              Cancel
            </button>
            <button
              onClick={deleteTarget?.type === 'cat' ? handleDeleteCategory : handleDeleteSub}
              disabled={deleteCat.isPending || deleteSub.isPending}
              className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium transition-all disabled:opacity-50"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-zinc-400 text-sm">
          Delete <strong className="text-white">"{deleteTarget?.name}"</strong>?
          {deleteTarget?.type === 'cat' && ' All sub-categories will also be deleted.'}
          {' '}This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
