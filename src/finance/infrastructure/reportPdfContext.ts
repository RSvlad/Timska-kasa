import { formatAmount } from "@shared/i18n/format";
import { LOCALE_FORMAT_TAGS, type Locale } from "@shared/i18n/locale";
import { translate, type MessageParams } from "@shared/i18n/messages";
import { reportPdfMessages, type ReportPdfKey } from "@finance/infrastructure/ReportPdf.messages";

const FULL_DATE: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
const DAY_MONTH: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

export interface PdfContext {
  readonly t: (key: ReportPdfKey, params?: MessageParams) => string;
  readonly amount: (value: number, currency: string) => string;
  readonly number: (value: number, maximumFractionDigits: number) => string;
  readonly date: (value: Date) => string;
  readonly dayMonth: (value: Date) => string;
  readonly time: (value: Date) => string;
}

export function createPdfContext(locale: Locale): PdfContext {
  const tag = LOCALE_FORMAT_TAGS[locale];
  return {
    t: (key, params) => translate(reportPdfMessages, locale, key, params),
    amount: (value, currency) => formatAmount(value, currency, tag),
    number: (value, maximumFractionDigits) => value.toLocaleString(tag, { maximumFractionDigits }),
    date: (value) => value.toLocaleDateString(tag, FULL_DATE),
    dayMonth: (value) => value.toLocaleDateString(tag, DAY_MONTH),
    time: (value) => value.toLocaleTimeString(tag, TIME),
  };
}
