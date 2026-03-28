'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, User, RefreshCw } from 'lucide-react';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/inventory/useSuppliers';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { SupplierType } from '@/types/inventory';

interface SupplierFormData {
  name: string; contact_name: string; email: string;
  phone: string; address: string; notes: string; is_active: boolean;
}

const EMPTY: SupplierFormData = { name: '', contact_name: '', email: '', phone: '', address: '', notes: '', is_active: true };

export default function SuppliersPage() {
  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState<SupplierType | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [form, setForm]           = useState<SupplierFormData>(EMPTY);
  const [error, setError]         = useState('');

  const { data: suppliers, isLoading, refetch } = useSuppliers();
  const createMutation  = useCreateSupplier();
  const updateMutation  = useUpdateSupplier();
  const deleteMutation  = useDeleteSupplier();

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };
  const openEdit   = (s: SupplierType) => {
    setEditing(s);
    setForm({ name: s.name, contact_name: s.contact_name ?? '', email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '', notes: s.notes ?? '', is_active: s.is_active });
    setError('');
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Supplier name is required.'); return; }
    setError('');
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
      } else {
        await createMutation.mutateAsync(form);
      }
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save supplier');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const isWorking = createMutation.isPending || updateMutation.isPending;

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  );
  const inputCls = "w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-all";

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Suppliers</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{(suppliers ?? []).length} suppliers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
            <RefreshCw className="size-4" />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all">
            <Plus className="size-4" />Add Supplier
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : (suppliers ?? []).length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <User className="size-12 mx-auto mb-3 text-zinc-700" />
          <p>No suppliers yet</p>
          <button onClick={openCreate} className="mt-3 text-xs text-brand-400 hover:text-brand-300 transition-colors">Add your first supplier →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(suppliers ?? []).map((s) => (
            <div key={s.id} className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-5 hover:bg-zinc-900 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{s.name}</h3>
                  {s.contact_name && <p className="text-xs text-zinc-500 mt-0.5">{s.contact_name}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(s)} className="size-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                    <Edit2 className="size-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(s.id)} className="size-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {s.email && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Mail className="size-3 flex-shrink-0" />{s.email}
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Phone className="size-3 flex-shrink-0" />{s.phone}
                  </div>
                )}
                {s.address && <p className="text-xs text-zinc-600 mt-2 line-clamp-2">{s.address}</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <span className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-medium border',
                  s.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                )}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Supplier' : 'Add Supplier'}
        size="md"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all">Cancel</button>
            <button onClick={handleSubmit} disabled={isWorking} className="px-5 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all disabled:opacity-50">
              {isWorking ? 'Saving…' : editing ? 'Save Changes' : 'Add Supplier'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <F label="Supplier Name *">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Auto Parts Ltd" className={inputCls} />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Contact Name">
              <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="John Doe" className={inputCls} />
            </F>
            <F label="Phone">
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" className={inputCls} />
            </F>
          </div>
          <F label="Email">
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="supplier@example.com" className={inputCls} />
          </F>
          <F label="Address">
            <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} placeholder="Full address…" className={cn(inputCls, 'resize-none')} />
          </F>
          <F label="Notes">
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes…" className={cn(inputCls, 'resize-none')} />
          </F>
          <F label="Status">
            <select value={String(form.is_active)} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))} className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500 transition-all">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </F>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Supplier"
        size="sm"
        footer={
          <>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all">Cancel</button>
            <button onClick={handleDelete} disabled={deleteMutation.isPending} className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium transition-all disabled:opacity-50">
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-zinc-400 text-sm">Are you sure you want to delete this supplier? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
