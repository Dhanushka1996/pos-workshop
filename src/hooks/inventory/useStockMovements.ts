'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { StockAdjustInput, GRNInput } from '@/lib/validations/inventory';

export interface StockMovement {
  id:          string;
  product_id:  string;
  type:        string;
  quantity:    number;
  balance:     number;
  reference:   string | null;
  notes:       string | null;
  cost_price:  number | null;
  created_at:  string;
  product:     { id: string; name: string; item_code: string };
}

export function useStockMovements(filters: { product_id?: string; type?: string; page?: number } = {}) {
  return useQuery<StockMovement[]>({
    queryKey: ['stock-movements', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
      const res = await fetch(`/api/inventory/stock-movements?${params}`);
      if (!res.ok) throw new Error('Failed to fetch movements');
      return res.json();
    },
    staleTime: 10_000,
  });
}

export function useStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StockAdjustInput) => {
      const res = await fetch('/api/inventory/stock-adjustment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Adjustment failed'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    },
  });
}

export function useGRNs(page = 1) {
  return useQuery({
    queryKey: ['grns', page],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/grn?page=${page}`);
      if (!res.ok) throw new Error('Failed to fetch GRNs');
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useCreateGRN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: GRNInput) => {
      const res = await fetch('/api/inventory/grn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'GRN failed'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grns'] });
      qc.invalidateQueries({ queryKey: ['grn'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    },
  });
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface GRNAssembly {
  id:            string;
  ref_number:    string | null;
  status:        string;
  purchase_cost: number;
  components:    { id: string }[];
}

export interface GRNItemDetail {
  id:         string;
  quantity:   number;
  cost_price: number;
  total:      number;
  product: {
    id: string; item_code: string; name: string;
    retail_price: number; product_type: string; is_assembly: boolean;
  };
  assemblies: GRNAssembly[];
}

export interface GRNDetail {
  id:             string;
  grn_number:     string;
  invoice_number: string | null;
  received_date:  string | null;
  total_cost:     number;
  notes:          string | null;
  status:         string;
  created_at:     string;
  supplier:       { id: string; name: string; phone: string | null; email: string | null } | null;
  items:          GRNItemDetail[];
  batches:        { id: string; batch_number: string; quantity: number; cost_price: number }[];
}

// ── useGRN (single) ────────────────────────────────────────────────────────
export function useGRN(id: string) {
  return useQuery<GRNDetail>({
    queryKey: ['grn', id],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/grn/${id}`);
      if (!res.ok) throw new Error('GRN not found');
      return res.json();
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}
