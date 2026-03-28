'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Truck, Mail, Phone, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSuppliers, useDeleteSupplier, type Supplier } from '@/hooks/inventory/useSuppliers';
import { SupplierModal } from '@/components/inventory/SupplierModal';

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | undefined>(undefined);

  function openNew() { setEditing(undefined); setModalOpen(true); }
  function openEdit(s: Supplier) { setEditing(s); setModalOpen(true); }
  function closeModal() { setEditing(undefined); setModalOpen(false); }

  function handleDelete(s: Supplier) {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    deleteSupplier.mutate(s.id);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
            <Link href="/dashboard/inventory" className="hover:text-zinc-400 transition-colors">Inventory</Link>
            <span>/</span>
            <span className="text-zinc-400">Suppliers</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="size-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Truck className="size-5 text-sky-400" />
            </div>
            Suppliers
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Manage your parts suppliers and contacts</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="size-4" />
          New Supplier
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-zinc-900/50 border border-white/[0.07] animate-pulse" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 py-20 text-center">
          <Truck className="size-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No suppliers yet</p>
          <button onClick={openNew} className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-sm font-medium transition-colors">
            <Plus className="size-3.5" /> Add Supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="group rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-5 hover:border-white/15 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <Truck className="size-5 text-sky-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{supplier.name}</p>
                    {supplier.contact_name && (
                      <p className="text-xs text-zinc-500 mt-0.5">{supplier.contact_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                    supplier.is_active
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-red-500/15 text-red-400'
                  )}>
                    {supplier.is_active
                      ? <><CheckCircle className="size-3" /> Active</>
                      : <><XCircle className="size-3" /> Inactive</>
                    }
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-zinc-500">
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-zinc-600 shrink-0" />
                    <a href={`mailto:${supplier.email}`} className="hover:text-zinc-300 transition-colors truncate">{supplier.email}</a>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-zinc-600 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-zinc-600 shrink-0" />
                    <span className="truncate">{supplier.address}</span>
                  </div>
                )}
              </div>

              {supplier.notes && (
                <p className="mt-3 text-xs text-zinc-600 italic line-clamp-2 border-t border-white/[0.05] pt-3">
                  {supplier.notes}
                </p>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.05]">
                {supplier._count?.products != null ? (
                  <span className="text-xs text-zinc-500">{supplier._count.products} linked products</span>
                ) : <span />}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(supplier)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => handleDelete(supplier)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <SupplierModal supplier={editing} onClose={closeModal} />}
    </div>
  );
}
