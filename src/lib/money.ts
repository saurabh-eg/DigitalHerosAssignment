import { SITE_CONFIG } from "@/constants/site-config";

const formatters = new Map<string, Intl.NumberFormat>();

/** Formats integer minor units (pence) as currency, e.g. 1234 → "£12.34". */
export function formatMoney(minor: number, currency: string = SITE_CONFIG.currency): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(SITE_CONFIG.locale, { style: "currency", currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(minor / 100);
}

export function formatPercent(bps: number): string {
  return `${(bps / 100).toLocaleString(SITE_CONFIG.locale, { maximumFractionDigits: 1 })}%`;
}
