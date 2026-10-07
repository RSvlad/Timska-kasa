// Shared: I18nProvider — активни језик, перзистенција избора и хук useT за преводе.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LOCALE_TAGS, persistLocale, resolveBrowserLocale, type Locale } from "./locale";
import { translate, type MessageParams, type Messages } from "./messages";

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nState | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveBrowserLocale);

  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): I18nState {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useLocale мора бити позван унутар I18nProvider-а");
  }
  return context;
}

export function useT<K extends string>(messages: Messages<K>) {
  const { locale } = useLocale();
  return useCallback(
    (key: K, params?: MessageParams) => translate(messages, locale, key, params),
    [messages, locale],
  );
}
