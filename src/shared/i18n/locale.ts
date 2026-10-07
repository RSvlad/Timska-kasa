import type { CompactSuffixes } from "./format";

export const LOCALES = ["sr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "timska-kasa.locale";

export const LOCALE_TAGS: Record<Locale, string> = {
  sr: "sr-Cyrl",
  en: "en",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  sr: "Српски",
  en: "English",
};

export const LOCALE_FORMAT_TAGS: Record<Locale, string> = {
  sr: "sr-RS",
  en: "en-GB",
};

export const LOCALE_COMPACT_SUFFIXES: Record<Locale, CompactSuffixes> = {
  sr: { thousand: "К", million: "М" },
  en: { thousand: "K", million: "M" },
};

export const LOCALE_BADGES: Record<Locale, string> = {
  sr: "СР",
  en: "EN",
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const primary = language.toLowerCase().split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}

export function resolveInitialLocale(
  storage: Pick<Storage, "getItem"> | null,
  languages: readonly string[],
): Locale {
  try {
    const stored = storage?.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Storage blocked (e.g. private mode) — fall back to browser language.
  }
  return detectLocale(languages);
}

function readStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function resolveBrowserLocale(): Locale {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return resolveInitialLocale(readStorage(), languages);
}

export function persistLocale(locale: Locale): void {
  try {
    readStorage()?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage unavailable — the choice lasts until the page is closed.
  }
}
