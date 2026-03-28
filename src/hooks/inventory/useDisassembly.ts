'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DisassemblyComponent {
  id:             string;
  disassembly_id: string;
  product_id:     string;
  qty:            number;
  unit_cost:      number;
  condition:      'good' | 'damaged' | 'scrap';
  recovered:      boolean;
  notes?:         string | null;
  created_at:     string;
  product: {
    id: string; item_code: string; name: string;
    current_stock: number; cost_price?: number;
    brand?:    { name: string } | null;
    category?: { name: string } | null;
  };
}

export interface DisassemblyRecord {
  id:         string;
  ref_number: string;
  product_id: string;
  quantity:   number;
  unit_cost:  number;
  notes?:     string | null;
  created_at: string;
  updated_at: string;
  product: {
    id: string; item_code: string; name: string;
    current_stock: number; product_type?: string;
    brand?:    { name: string } | null;
    category?: { name: string } | null;
  };
  components:  DisassemblyComponent[];
  _count?: { components: number };
}

export interface DisassemblyListItem extends Omit<DisassemblyRecord, 'movements'> {
  _count: { components: number };
}

export interface CreateDisassemblyPayload {
  product_id: string;
  quantity:   number;
  unit_cost?: number;
  notes?:     string;
  components: {
    product_id: string;
    qty:        number;
    unit_cost?: number;
    condition?: 'good' | 'damaged' | 'scrap';
    recovered?: boolean;
    notes?:     string;
  }[];
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const disassemblyKeys = {
  all:    () => ['disassembly'] as const,
  list:   (params: Record<string, unknown> = {}) => ['disassembly', 'list', params] as const,
  detail: (id: string) => ['disassembly', 'detail', id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDisassemblies(params: { q?: string; page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.q)     search.set('q',     params.q);
  if (params.page)  search.set('page',  String(params.page));
  if (params.limit) search.set('limit', String(params.limit));

  return useQuery({
    queryKey: disassemblyKeys.list(params),
    queryFn:  async () => {
      const res = await fetch(`/api/disassembly?${search}`);
      if (!res.ok) throw new Error('Failed to fetch disassembly records');
      return res.json() as Promise<{
        records: DisassemblyListItem[];
        total:   number;
        page:    number;
        limit:   number;
        pages:   number;
      }>;
    },
    staleTime: 15_000,
  });
}

export function useDisassembly(id: string) {
  return useQuery({
    queryKey: disassemblyKeys.detail(id),
    queryFn:  async () => {
      const res = await fetch(`/api/disassembly/${id}`);
      if (!res.ok) throw new Error('Disassembly record not found');
      return res.json() as Promise<DisassemblyRecord & {
        movements: {
          id: string; type: string; quantity: number; balance: number;
          reference: string | null; notes: string | null; created_at: string;
          product: { id: string; item_code: string; name: string };
        }[];
      }>;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useCreateDisassembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDisassemblyPayload) => {
      const res = await fetch('/api/disassembly', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          typeof err.error === 'string'
            ? err.error
            : JSON.stringify(err.error),
        );
      }
      return res.json() as Promise<DisassemblyRecord>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: disassemblyKeys.all() });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a summary of a disassembly's components. */
export function getDisassemblySummary(components: DisassemblyComponent[]) {
  const recovered = components.filter(c => c.recovered);
  const skipped   = components.filter(c => !c.recovered);
  const totalQty  = components.reduce((s, c) => s + c.qty, 0);
  return { recovered, skipped, totalQty };
}

/** Condition badge config. */
export const CONDITION_CONFIG = {
  good:    { label: 'Good',    color: 'emerald' },
  damaged: { label: 'Damaged', color: 'amber'   },
  scrap:   { label: 'Scrap',   color: 'red'     },
} as const;
