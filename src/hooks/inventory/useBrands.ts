'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export interface Brand {
  id:           string;
  name:         string;
  description?: string | null;
  logo_url?:    string | null;
  created_at?:  string;
  updated_at?:  string;
  _count?:      { products: number };
}

async function fetchBrands() {
  const res = await fetch('/api/inventory/brands');
  if (!res.ok) throw new Error('Failed to fetch brands');
  return res.json();
}

async function createBrand(data: { name: string; description?: string }) {
  const res = await fetch('/api/inventory/brands', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to create brand'); }
  return res.json();
}

async function updateBrand({ id, data }: { id: string; data: { name?: string; description?: string } }) {
  const res = await fetch(`/api/inventory/brands/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to update brand'); }
  return res.json();
}

async function deleteBrand(id: string) {
  const res = await fetch(`/api/inventory/brands/${id}`, { method: 'DELETE' });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to delete brand'); }
  return res.json();
}

export function useBrands() {
  return useQuery<Brand[]>({ queryKey: ['brands'], queryFn: fetchBrands, staleTime: 60_000 });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBrand,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['brands'] }),
  });
}

export function useUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateBrand,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['brands'] }),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBrand,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['brands'] }),
  });
}
