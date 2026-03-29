'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const dynamic = 'force-dynamic';

// ── Types ──────────────────────────────────────────────────────────────────
export interface AssemblyProduct {
  id: string;
  item_code: string;
  name: string;
  current_stock: number;
  cost_price?: number;
  retail_price?: number;
  track_stock?: boolean;
  product_type?: string;
}

export interface AssemblyComponent {
  id:             string;
  assembly_id:    string;
  product_id:     string;
  qty_total:      number;
  qty_extracted:  number;
  allocated_cost: number;
  notes?:         string;
  product:        AssemblyProduct;
}

export interface DismantleLog {
  id:                    string;
  assembly_id:           string;
  assembly_component_id: string;
  product_id:            string;
  qty_extracted:         number;
  notes?:                string;
  created_at:            string;
  product:               { id: string; item_code: string; name: string };
}

export type AssemblyStatus = 'intact' | 'partial' | 'complete';

export interface Assembly {
  id:            string;
  product_id:    string;
  ref_number?:   string;    // ASM-000001 auto-generated
  reference?:    string;    // user-provided: vehicle reg, serial, etc.
  purchase_cost: number;
  status:        AssemblyStatus;
  notes?:        string;
  created_at:    string;
  updated_at:    string;
  product:       AssemblyProduct;
  components:    AssemblyComponent[];
  dismantle_logs?: DismantleLog[];
  _count?:       { dismantle_logs: number };
}

export interface CreateAssemblyInput {
  // Mode A: link to existing product
  product_id?: string;
  // Mode B: create product inline
  product_data?: {
    name:        string;
    item_code?:  string;
    category_id?: string;
    brand_id?:   string;
    cost_price?: number;
  };
  reference?:    string;
  purchase_cost: number;
  notes?:        string;
  components?: {
    product_id:     string;
    qty_total:      number;
    allocated_cost: number;
    notes?:         string;
  }[];
}

export interface DismantleInput {
  extractions: { component_id: string; qty: number }[];
  notes?: string;
}

export interface BreakdownInput {
  /** AssemblyComponent IDs that were SOLD / USED externally (no stock recovery). */
  usedComponentIds: string[];
  notes?: string;
}

export interface BreakdownResult {
  success:   boolean;
  status:    string;
  recovered: { name: string; qty: number }[];
  sold:      { name: string; qty: number }[];
  summary:   { recoveredCount: number; soldCount: number; message: string };
}

// ── Keys ───────────────────────────────────────────────────────────────────
export const assemblyKeys = {
  all:    ['assemblies'] as const,
  list:   (params?: Record<string, string>) => ['assemblies', 'list', params] as const,
  detail: (id: string) => ['assemblies', 'detail', id] as const,
};

// ── List ───────────────────────────────────────────────────────────────────
export function useAssemblies(params?: { status?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.q)      qs.set('q', params.q);

  return useQuery({
    queryKey: assemblyKeys.list(params as Record<string, string>),
    queryFn:  async () => {
      const res = await fetch(`/api/assemblies?${qs}`);
      if (!res.ok) throw new Error('Failed to load assemblies');
      return res.json() as Promise<Assembly[]>;
    },
  });
}

// ── Detail ─────────────────────────────────────────────────────────────────
export function useAssembly(id: string) {
  return useQuery({
    queryKey: assemblyKeys.detail(id),
    queryFn:  async () => {
      const res = await fetch(`/api/assemblies/${id}`);
      if (!res.ok) throw new Error('Assembly not found');
      return res.json() as Promise<Assembly>;
    },
    enabled: !!id,
  });
}

// ── Create ─────────────────────────────────────────────────────────────────
export function useCreateAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAssemblyInput) => {
      const res = await fetch('/api/assemblies', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create assembly');
      return data as Assembly;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: assemblyKeys.all }),
  });
}

// ── Update header ──────────────────────────────────────────────────────────
export function useUpdateAssembly(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CreateAssemblyInput>) => {
      const res = await fetch(`/api/assemblies/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update assembly');
      return data as Assembly;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assemblyKeys.all });
      qc.invalidateQueries({ queryKey: assemblyKeys.detail(id) });
    },
  });
}

// ── Delete ─────────────────────────────────────────────────────────────────
export function useDeleteAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/assemblies/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete assembly');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: assemblyKeys.all }),
  });
}

// ── Add component ──────────────────────────────────────────────────────────
export function useAddComponent(assemblyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      product_id: string; qty_total: number; allocated_cost: number; notes?: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/components`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add component');
      return data as AssemblyComponent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: assemblyKeys.detail(assemblyId) }),
  });
}

// ── Update component ───────────────────────────────────────────────────────
export function useUpdateComponent(assemblyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ componentId, ...data }: {
      componentId: string; qty_total?: number; allocated_cost?: number; notes?: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/components/${componentId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Failed to update component');
      return result as AssemblyComponent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: assemblyKeys.detail(assemblyId) }),
  });
}

// ── Remove component ───────────────────────────────────────────────────────
export function useRemoveComponent(assemblyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (componentId: string) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/components/${componentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to remove component');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: assemblyKeys.detail(assemblyId) }),
  });
}

// ── Dismantle ──────────────────────────────────────────────────────────────
export function useDismantle(assemblyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DismantleInput) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/dismantle`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Dismantling failed');
      return data as { success: boolean; status: string; extracted: number; summary: { componentName: string; qty: number }[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assemblyKeys.all });
      qc.invalidateQueries({ queryKey: assemblyKeys.detail(assemblyId) });
      // Also invalidate products since stock changed
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ── Breakdown ──────────────────────────────────────────────────────────────

export function useBreakdown(assemblyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BreakdownInput) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/breakdown`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Breakdown failed');
      return data as BreakdownResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assemblyKeys.all });
      qc.invalidateQueries({ queryKey: assemblyKeys.detail(assemblyId) });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    },
  });
}

// ── Cost Distribution ──────────────────────────────────────────────────────
export interface CostDistributionInput {
  mode:        'manual' | 'equal' | 'proportional';
  components?: { id: string; allocated_cost: number }[];
}

export function useCostDistribution(assemblyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CostDistributionInput) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/cost-distribution`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Cost distribution failed');
      return data as { success: boolean; total_allocated: number; assembly: Assembly };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assemblyKeys.detail(assemblyId) });
      qc.invalidateQueries({ queryKey: assemblyKeys.all });
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
export function getAssemblyProgress(components: AssemblyComponent[]) {
  if (!components.length) return { totalUnits: 0, extractedUnits: 0, pct: 0 };
  const totalUnits     = components.reduce((s, c) => s + c.qty_total,     0);
  const extractedUnits = components.reduce((s, c) => s + c.qty_extracted, 0);
  return { totalUnits, extractedUnits, pct: totalUnits > 0 ? (extractedUnits / totalUnits) * 100 : 0 };
}

export function getComponentRemaining(c: AssemblyComponent): number {
  return Math.max(0, c.qty_total - c.qty_extracted);
}
