/**
 * Global currency store (Zustand).
 *
 * Architecture:
 *   DB (settings table)
 *     → GET /api/settings  (React Query)
 *       → CurrencyProvider (syncs on settings change)
 *         → useCurrencyStore (Zustand — single source of truth)
 *           → useCurrency() hook  (reactive in every component)
 *
 * One store.  One formatter.  Zero hardcoded symbols.
 */

import { create } from 'zustand';
import { formatCurrency, DEFAULT_CURRENCY, type CurrencyConfig } from '@/lib/currency';

interface CurrencyState {
  /** Current currency configuration — defaults to LKR until settings load */
  config: CurrencyConfig;
  /** Whether settings have been loaded from the server at least once */
  isLoaded: boolean;
  /** Update the config (called by CurrencyProvider when settings change) */
  setConfig: (config: CurrencyConfig) => void;
  /** Convenience formatter — always uses the current config */
  fmt: (amount: number) => string;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  config:   DEFAULT_CURRENCY,
  isLoaded: false,

  setConfig: (config) =>
    set({ config, isLoaded: true }),

  // fmt reads from get() so it always reflects the latest config
  // without needing to be re-created on every render
  fmt: (amount) => formatCurrency(amount, get().config),
}));

/**
 * Non-hook access for use outside React (utilities, server actions, etc.).
 * Not reactive — only call this inside event handlers, not render functions.
 */
export function getCurrencyFormatter() {
  return (amount: number) => formatCurrency(amount, useCurrencyStore.getState().config);
}
