'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SupplierInput } from '@/lib/validations/inventory';

export const dynamic = 'force-dynamic';

export interface Supplier {
  id:           string;
  name:         string;
  contact_name: string | null;
  email:        string | null;
  phone:        string | null;
  address:      string | null;
  notes:        string | null;
  is_active:    boolean;
  created_at:   string;
  updated_at?:  string;
  _count?:      { products: number };
}

const BASE = '/api/inventory/suppliers';

async function fetchSuppliers() {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  return res.json();
}

async function createSupplier(data: SupplierInput) {
  const res = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to create'); }
  return res.json();
}

async function updateSupplier({ id, data }: { id: string; data: Partial<SupplierInput> }) {
  const res = await fetch(`${BASE}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to update'); }
  return res.json();
}

async function deleteSupplier(id: string) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete supplier');
  return res.json();
}

export function useSuppliers() {
  return useQuery<Supplier[]>({ queryKey: ['suppliers'], queryFn: fetchSuppliers, staleTime: 60_000 });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createSupplier, onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }) });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: updateSupplier, onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }) });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteSupplier, onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }) });
}
