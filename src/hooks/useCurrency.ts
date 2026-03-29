'use client';

/**
 * useCurrency — the single hook every component uses to format prices.
 *
 * Usage:
 *   const { fmt } = useCurrency();
 *   fmt(1500) → "Rs 1,500.00"   (LKR)
 *   fmt(5.99) → "$ 5.99"        (USD)
 *
 * When the user changes currency in Settings, every component
 * that calls useCurrency() re-renders automatically.
 */

import { useCallback } from 'react';
import { useCurrencyStore } from '@/store/currencyStore';
import { formatCurrency, type CurrencyConfig } from '@/lib/currency';

export const dynamic = 'force-dynamic';

export interface UseCurrencyReturn {
  /** Format an amount using the globally-configured currency */
  fmt:    (amount: number) => string;
  /** Raw config — use when you need code/symbol/decimals directly */
  config: CurrencyConfig;
  /** Shorthand: currency symbol (e.g. "Rs", "$") */
  symbol: string;
  /** Shorthand: ISO currency code (e.g. "LKR", "USD") */
  code:   string;
  /** True once settings have been fetched from the server */
  ready:  boolean;
}

export function useCurrency(): UseCurrencyReturn {
  const config   = useCurrencyStore(s => s.config);
  const isLoaded = useCurrencyStore(s => s.isLoaded);

  const fmt = useCallback(
    (amount: number) => formatCurrency(amount, config),
    [config],
  );

  return {
    fmt,
    config,
    symbol: config.symbol,
    code:   config.code,
    ready:  isLoaded,
  };
}
