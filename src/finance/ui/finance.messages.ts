import { defineMessages } from "@shared/i18n/messages";
import type { RecordType } from "@finance/domain/Category";
import type { PeriodPreset } from "@finance/domain/Period";

export const financeMessages = defineMessages({
  sr: {
    "recordType.income": "Приход",
    "recordType.expense": "Расход",
    "period.today": "Данас",
    "period.month": "Месец",
    "period.year": "Година",
    "period.all": "Све",
  },
  en: {
    "recordType.income": "Income",
    "recordType.expense": "Expense",
    "period.today": "Today",
    "period.month": "Month",
    "period.year": "Year",
    "period.all": "All",
  },
});

export const RECORD_TYPE_KEYS = {
  Приход: "recordType.income",
  Расход: "recordType.expense",
} as const satisfies Record<RecordType, string>;

export const PERIOD_PRESET_KEYS = {
  данас: "period.today",
  "овај месец": "period.month",
  "ова година": "period.year",
  све: "period.all",
} as const satisfies Record<PeriodPreset, string>;
