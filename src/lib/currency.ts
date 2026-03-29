// ─── Currency Configuration ───────────────────────────────────────────────────
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
export interface CurrencyConfig {
  code:            string;
  symbol:          string;
  symbol_position: 'before' | 'after';
  decimal_places:  number;
}

// ─── Known currency presets ───────────────────────────────────────────────────

export const CURRENCY_PRESETS: Record<string, { name: string; symbol: string; symbol_position: 'before' | 'after'; decimal_places: number }> = {
  LKR: { name: 'Sri Lankan Rupee',  symbol: 'Rs',   symbol_position: 'before', decimal_places: 2 },
  USD: { name: 'US Dollar',          symbol: '$',    symbol_position: 'before', decimal_places: 2 },
  EUR: { name: 'Euro',               symbol: '€',    symbol_position: 'before', decimal_places: 2 },
  GBP: { name: 'British Pound',      symbol: '£',    symbol_position: 'before', decimal_places: 2 },
  AED: { name: 'UAE Dirham',         symbol: 'AED',  symbol_position: 'before', decimal_places: 2 },
  INR: { name: 'Indian Rupee',       symbol: '₹',    symbol_position: 'before', decimal_places: 2 },
  AUD: { name: 'Australian Dollar',  symbol: 'A$',   symbol_position: 'before', decimal_places: 2 },
  SGD: { name: 'Singapore Dollar',   symbol: 'S$',   symbol_position: 'before', decimal_places: 2 },
  JPY: { name: 'Japanese Yen',       symbol: '¥',    symbol_position: 'before', decimal_places: 0 },
};

// ─── Default settings (LKR) ───────────────────────────────────────────────────

export const DEFAULT_CURRENCY: CurrencyConfig = {
  code:            'LKR',
  symbol:          'Rs',
  symbol_position: 'before',
  decimal_places:  2,
};

// ─── Core formatter ───────────────────────────────────────────────────────────

/**
 * Format a number as currency using the provided config.
 *
 * Examples:
 *   formatCurrency(1500,   LKR_CONFIG) → "Rs 1,500.00"
 *   formatCurrency(5.99,   USD_CONFIG) → "$ 5.99"
 *   formatCurrency(99.9,   EUR_CONFIG) → "€ 99.90"
 */
export function formatCurrency(amount: number, config: CurrencyConfig): string {
  const abs = Math.abs(amount);
  const formatted = abs
    .toFixed(config.decimal_places)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const signed = amount < 0 ? '-' : '';

  return config.symbol_position === 'before'
    ? `${signed}${config.symbol} ${formatted}`
    : `${signed}${formatted} ${config.symbol}`;
}

/**
 * Build a formatter function from a config — useful for components:
 *   const fmt = makeCurrencyFormatter(config);
 *   fmt(1500) → "Rs 1,500.00"
 */
export function makeCurrencyFormatter(config: CurrencyConfig): (amount: number) => string {
  return (amount: number) => formatCurrency(amount, config);
}

/**
 * Apply currency preset defaults, overriding with custom values.
 */
export function buildConfig(
  code:            string,
  symbol?:         string,
  symbol_position?: 'before' | 'after',
  decimal_places?:  number,
): CurrencyConfig {
  const preset = CURRENCY_PRESETS[code] ?? CURRENCY_PRESETS['LKR'];
  return {
    code,
    symbol:          symbol          ?? preset.symbol,
    symbol_position: symbol_position ?? preset.symbol_position,
    decimal_places:  decimal_places  ?? preset.decimal_places,
  };
}
