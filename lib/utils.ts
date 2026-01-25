import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Format currency with appropriate decimal places based on currency
 *
 * @param amount - The amount to format
 * @param currency - Currency code (default: BHD)
 * @param options - Formatting options
 *
 * @example
 * ```ts
 * formatCurrency(1234.567) // "BHD 1,234.567"
 * formatCurrency(1234.56, "USD") // "$1,234.56"
 * formatCurrency(1234.567, "BHD", { compact: true }) // "BHD 1.2K"
 * formatCurrency(1234.567, "BHD", { showSymbol: false }) // "1,234.567"
 * ```
 */
export function formatCurrency(
  amount: number,
  currency: string = "BHD",
  options?: {
    /** Show compact notation for large numbers */
    compact?: boolean;
    /** Override minimum fraction digits */
    minFractionDigits?: number;
    /** Override maximum fraction digits */
    maxFractionDigits?: number;
    /** Show currency symbol (default: true) */
    showSymbol?: boolean;
    /** Use narrow symbol (e.g., "$" instead of "US$") */
    narrowSymbol?: boolean;
  }
): string {
  // Determine decimal places based on currency
  // BHD uses 3 decimal places, most others use 2
  const defaultDecimals = currency === "BHD" ? 3 : 2;
  const minFractionDigits = options?.minFractionDigits ?? defaultDecimals;
  const maxFractionDigits = options?.maxFractionDigits ?? defaultDecimals;

  // Determine locale based on currency
  const locale = currency === "BHD" ? "en-BH" : "en-US";

  if (options?.showSymbol === false) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
      notation: options?.compact ? "compact" : "standard",
    }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: options?.compact ? 0 : minFractionDigits,
    maximumFractionDigits: options?.compact ? 1 : maxFractionDigits,
    notation: options?.compact ? "compact" : "standard",
    currencyDisplay: options?.narrowSymbol ? "narrowSymbol" : "symbol",
  }).format(amount);
}

/**
 * Format currency for display in compact form (e.g., "1.2K")
 * Useful for charts and limited space
 */
export function formatCompactCurrency(
  amount: number,
  currency: string = "BHD"
): string {
  return formatCurrency(amount, currency, { compact: true });
}

/**
 * Format currency as plain number with appropriate decimals
 * Useful for input fields
 */
export function formatCurrencyValue(
  amount: number,
  currency: string = "BHD"
): string {
  return formatCurrency(amount, currency, { showSymbol: false });
}

/**
 * Parse a currency string back to number
 * Handles various formats including BHD and USD
 */
export function parseCurrencyString(value: string): number {
  // Remove currency symbols, spaces, and thousands separators
  const cleaned = value
    .replace(/[^0-9.-]/g, "")
    .replace(/,/g, "");
  return parseFloat(cleaned) || 0;
}
