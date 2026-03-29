'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildConfig, DEFAULT_CURRENCY, type CurrencyConfig } from '@/lib/currency';
import { useCurrencyStore } from '@/store/currencyStore';

export const dynamic = 'force-dynamic';

export interface AppSettings {
  id:               string;
  business_name:    string;
  currency_code:    string;
  currency_symbol:  string;
  symbol_position:  'before' | 'after';
  decimal_places:   number;
  tax_rate:         number;
  receipt_footer:   string | null;
}

async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

async function updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  const res = await fetch('/api/settings', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to update settings'); }
  return res.json();
}

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey:  ['settings'],
    queryFn:   fetchSettings,
    staleTime: 60_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

/**
 * Returns the currency config from the global Zustand store.
 * Reactive — re-renders when currency settings change.
 * @deprecated Use `useCurrency()` from `@/hooks/useCurrency` for formatting.
 */
export function useCurrencyConfig(): CurrencyConfig {
  // Read directly from Zustand — no extra React Query subscription needed
  return useCurrencyStore(s => s.config);
}
