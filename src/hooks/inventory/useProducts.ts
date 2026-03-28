'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProductInput } from '@/lib/validations/inventory';

const BASE = '/api/inventory/products';

/** Minimal shape of a product returned by the API — extend as needed. */
export interface Product {
  id:                   string;
  item_code:            string;
  name:                 string;
  description?:         string | null;
  vehicle_compatibility?: string | null;
  category_id?:         string | null;
  sub_category_id?:     string | null;
  brand_id?:            string | null;
  supplier_id?:         string | null;
  cost_price:           number;
  retail_price:         number;
  wholesale_price:      number;
  min_price:            number;
  current_stock:        number;
  reorder_level:        number;
  reorder_qty:          number;
  track_stock:          boolean;
  is_active:            boolean;
  is_assembly:          boolean;
  product_type:         string;
  created_at:           string;
  updated_at:           string;
  category?:            { id: string; name: string } | null;
  sub_category?:        { id: string; name: string } | null;
  brand?:               { id: string; name: string } | null;
  supplier?:            { id: string; name: string } | null;
  barcodes?:            { id: string; barcode: string; is_primary: boolean }[];
}

export interface ProductFilters {
  search?:       string;
  category_id?:  string;
  brand_id?:     string;
  status?:       string;
  product_type?: string;   // NORMAL | ASSEMBLY | '' (all)
  sortBy?:       string;
  sortDir?:      'asc' | 'desc';
  page?:         number;
  limit?:        number;
}

async function fetchProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

async function fetchProduct(id: string) {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Product not found');
  return res.json();
}

async function createProduct(data: ProductInput) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to create product'); }
  return res.json();
}

async function updateProduct({ id, data }: { id: string; data: Partial<ProductInput> }) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to update'); }
  return res.json();
}

async function deleteProduct(id: string) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
  return res.json();
}

async function duplicateProduct(id: string) {
  const res = await fetch(`${BASE}/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to duplicate product'); }
  return res.json();
}

// ─── Query Hooks ────────────────────────────────────────────────────────────

export interface ProductsPage {
  products:   Product[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery<ProductsPage>({
    queryKey: ['products', filters],
    queryFn:  () => fetchProducts(filters),
    staleTime: 15_000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn:  () => fetchProduct(id),
    enabled:  !!id,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProduct,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', vars.id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDuplicateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: duplicateProduct,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
