'use client';

/**
 * CurrencyProvider
 *
 * Lives inside <QueryProvider> so it can call useSettings().
 * Whenever the settings change (e.g. after a PUT /api/settings),
 * React Query re-fetches and this effect pushes the new config
 * into the Zustand store — triggering a re-render in every
 * component that calls useCurrency().
 *
 * No page refresh required.
 */

import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useCurrencyStore } from '@/store/currencyStore';
import { buildConfig } from '@/lib/currency';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSettings();
  const setConfig          = useCurrencyStore(s => s.setConfig);

  useEffect(() => {
    if (!settings) return;

    setConfig(buildConfig(
      settings.currency_code,
      settings.currency_symbol,
      settings.symbol_position,
      settings.decimal_places,
    ));
  }, [
    settings?.currency_code,
    settings?.currency_symbol,
    settings?.symbol_position,
    settings?.decimal_places,
    setConfig,
  ]);

  return <>{children}</>;
}
