import { useMemo } from "react";
import { formatAmount, formatCompact } from "./format";
import { useLocale } from "./I18nProvider";
import { LOCALE_COMPACT_SUFFIXES, LOCALE_FORMAT_TAGS } from "./locale";

export function useFormatters() {
  const { locale } = useLocale();
  const tag = LOCALE_FORMAT_TAGS[locale];
  const suffixes = LOCALE_COMPACT_SUFFIXES[locale];

  return useMemo(
    () => ({
      tag,
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        value.toLocaleString(tag, options),
      amount: (value: number, currency: string) => formatAmount(value, currency, tag),
      compact: (value: number) => formatCompact(value, tag, suffixes),
      date: (value: Date, options?: Intl.DateTimeFormatOptions) =>
        value.toLocaleDateString(tag, options),
      time: (value: Date, options?: Intl.DateTimeFormatOptions) =>
        value.toLocaleTimeString(tag, options),
      dateTime: (value: Date) => value.toLocaleString(tag),
    }),
    [tag, suffixes],
  );
}
