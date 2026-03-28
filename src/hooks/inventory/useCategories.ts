'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Category {
  id:              string;
  name:            string;
  description:     string | null;
  color:           string | null;
  created_at?:     string;
  updated_at?:     string;
  _count?:         { products: number };
  sub_categories?: { id: string; name: string; category_id: string }[];
}

// ─── Categories ───────────────────────────────────────────────────────────────

async function fetchCategories() {
  const res = await fetch('/api/inventory/categories');
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

async function createCategory(data: { name: string; description?: string; color?: string }) {
  const res = await fetch('/api/inventory/categories', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to create category'); }
  return res.json();
}

async function updateCategory({ id, data }: { id: string; data: { name?: string; description?: string; color?: string } }) {
  const res = await fetch(`/api/inventory/categories/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to update category'); }
  return res.json();
}

async function deleteCategory(id: string) {
  const res = await fetch(`/api/inventory/categories/${id}`, { method: 'DELETE' });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to delete category'); }
  return res.json();
}

export function useCategories() {
  return useQuery<Category[]>({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: 60_000 });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateCategory,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

// ─── Sub-Categories ───────────────────────────────────────────────────────────

async function fetchSubCategories(category_id?: string) {
  const url = category_id
    ? `/api/inventory/sub-categories?category_id=${category_id}`
    : '/api/inventory/sub-categories';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch sub-categories');
  return res.json();
}

async function createSubCategory(data: { name: string; category_id: string }) {
  const res = await fetch('/api/inventory/sub-categories', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to create sub-category'); }
  return res.json();
}

async function updateSubCategory({ id, name }: { id: string; name: string }) {
  const res = await fetch(`/api/inventory/sub-categories/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to update sub-category'); }
  return res.json();
}

async function deleteSubCategory(id: string) {
  const res = await fetch(`/api/inventory/sub-categories/${id}`, { method: 'DELETE' });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to delete sub-category'); }
  return res.json();
}

export function useSubCategories(category_id?: string) {
  return useQuery({
    queryKey: ['sub-categories', category_id],
    queryFn:  () => fetchSubCategories(category_id),
    staleTime: 30_000,
  });
}

export function useCreateSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSubCategory,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['sub-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] }); // refreshes sub_categories in parent
    },
  });
}

export function useUpdateSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSubCategory,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['sub-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSubCategory,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['sub-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ─── UOMs ─────────────────────────────────────────────────────────────────────

async function fetchUOMs() {
  const res = await fetch('/api/inventory/uom');
  if (!res.ok) throw new Error('Failed to fetch UOMs');
  return res.json();
}

export function useUOMs() {
  return useQuery({ queryKey: ['uoms'], queryFn: fetchUOMs, staleTime: 60_000 });
}
