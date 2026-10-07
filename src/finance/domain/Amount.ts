// Bounded Context: Finance
// Value Object: Износ (видети Context/domain-model.md, ADR-009)

export interface Amount {
  readonly value: number;
  readonly currency: string; // ISO 4217, нпр. "RSD", "EUR", "USD"
}

const CURRENCY_FORMAT = /^[A-Z]{3}$/;

type IntlWithSupported = typeof Intl & {
  supportedValuesOf?: (key: string) => string[];
};

let supportedCurrencies: Set<string> | null | undefined;

function getSupportedCurrencies(): Set<string> | null {
  if (supportedCurrencies !== undefined) return supportedCurrencies;
  try {
    const list = (Intl as IntlWithSupported).supportedValuesOf?.("currency");
    supportedCurrencies = list && list.length > 0 ? new Set(list) : null;
  } catch {
    supportedCurrencies = null;
  }
  return supportedCurrencies;
}

// Тримује и подиже у велика слова.
export function normalizeCurrency(input: string): string {
  return input.trim().toUpperCase();
}

// Валидна ISO 4217 шифра: 3 слова, и позната прегледачу (ако он то може да каже).
export function isValidCurrency(input: string): boolean {
  const code = normalizeCurrency(input);
  if (!CURRENCY_FORMAT.test(code)) return false;
  const supported = getSupportedCurrencies();
  return supported ? supported.has(code) : true;
}

export const MAX_AMOUNT = 1e12;

// Аритметика у целобројним минорним јединицама (стотинке): избегава акумулацију
// грешке плутајућег зареза. Сабирање/одузимање радити над toMinor(), а резултат
// враћати кроз fromMinor(). Складиштење у Firestore-у остаје непромењено (број са ≤2 децимале).
export function toMinor(value: number): number {
  return Math.round(value * 100);
}

export function fromMinor(minor: number): number {
  return minor / 100;
}

// Парсира унос износа: прихвата "10,5" и "10.5", највише 2 децимале, позитиван,
// коначан и ≤ MAX_AMOUNT. Враћа null за све остало (Infinity, 1e21, hex, празно, ...).
export function parseAmountInput(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT ? n : null;
}
