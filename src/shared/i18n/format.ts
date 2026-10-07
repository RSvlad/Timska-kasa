const THOUSAND = 1_000;
const MILLION = 1_000_000;
const MAX_FRACTION_DIGITS = 2;

export interface CompactSuffixes {
  readonly thousand: string;
  readonly million: string;
}

export function formatAmount(value: number, currency: string, tag: string): string {
  try {
    return new Intl.NumberFormat(tag, {
      style: "currency",
      currency,
      maximumFractionDigits: MAX_FRACTION_DIGITS,
    }).format(value);
  } catch {
    return `${value.toLocaleString(tag, { maximumFractionDigits: MAX_FRACTION_DIGITS })} ${currency}`;
  }
}

function scaled(value: number, divisor: number, tag: string): string {
  return (value / divisor).toLocaleString(tag, { maximumFractionDigits: MAX_FRACTION_DIGITS });
}

export function formatCompact(value: number, tag: string, suffixes: CompactSuffixes): string {
  const abs = Math.abs(value);
  if (abs >= MILLION) return scaled(value, MILLION, tag) + suffixes.million;
  if (abs >= THOUSAND) return scaled(value, THOUSAND, tag) + suffixes.thousand;
  return value.toLocaleString(tag);
}
