// Application: израда Извештаја из Финансијских записа (чиста функција, без инфраструктуре).

import { fromMinor, toMinor } from "@finance/domain/Amount";
import type { Category, RecordType } from "@finance/domain/Category";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { Fund } from "@finance/domain/Fund";
import type { Period } from "@finance/domain/Period";
import type { BalancePoint, CategoryTotal, CurrencyReport, Report } from "@finance/domain/Report";

const UNKNOWN_CATEGORY = "—";
const UNKNOWN_FUND = "Непознат фонд";

interface NameLookup {
  category: (id: string) => string;
  fund: (id: string) => string;
}

function signedMinor(record: FinanceRecord): number {
  const minor = toMinor(record.amount.value);
  return record.type === "Приход" ? minor : -minor;
}

function netMinor(records: FinanceRecord[]): number {
  return records.reduce((sum, r) => sum + signedMinor(r), 0);
}

function totalMinor(records: FinanceRecord[], type: RecordType): number {
  return records
    .filter((r) => r.type === type)
    .reduce((sum, r) => sum + toMinor(r.amount.value), 0);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function chronological(a: FinanceRecord, b: FinanceRecord): number {
  return a.dateTime.getTime() - b.dateTime.getTime() || a.id.localeCompare(b.id);
}

function inPeriod(record: FinanceRecord, period: Period | null): boolean {
  return !period || (record.dateTime >= period.from && record.dateTime < period.to);
}

// Једна тачка по дану са активношћу; уз период, прва тачка је почетно стање.
function buildBalanceSeries(
  entries: FinanceRecord[],
  openingMinor: number,
  period: Period | null,
): BalancePoint[] {
  const points: BalancePoint[] = period
    ? [{ date: period.from, balance: fromMinor(openingMinor) }]
    : [];
  const firstEntryIndex = points.length;
  let running = openingMinor;
  for (const record of entries) {
    running += signedMinor(record);
    const point = { date: startOfDay(record.dateTime), balance: fromMinor(running) };
    const last = points[points.length - 1];
    if (points.length > firstEntryIndex && last.date.getTime() === point.date.getTime()) {
      points[points.length - 1] = point;
    } else {
      points.push(point);
    }
  }
  return points;
}

function buildCategoryTotals(
  entries: FinanceRecord[],
  categoryName: (id: string) => string,
): CategoryTotal[] {
  const totals = new Map<string, { categoryName: string; type: RecordType; minor: number }>();
  for (const record of entries) {
    const key = `${record.type}|${record.categoryId}`;
    const current = totals.get(key) ?? {
      categoryName: categoryName(record.categoryId),
      type: record.type,
      minor: 0,
    };
    current.minor += toMinor(record.amount.value);
    totals.set(key, current);
  }
  return [...totals.values()]
    .sort((a, b) => b.minor - a.minor)
    .map(({ categoryName: name, type, minor }) => ({
      categoryName: name,
      type,
      total: fromMinor(minor),
    }));
}

function buildCurrencyReport(
  currency: string,
  records: FinanceRecord[],
  period: Period | null,
  names: NameLookup,
): CurrencyReport | null {
  const sorted = [...records].sort(chronological);
  const openingMinor = period ? netMinor(sorted.filter((r) => r.dateTime < period.from)) : 0;
  const entries = sorted.filter((r) => inPeriod(r, period));
  if (entries.length === 0 && openingMinor === 0) return null;

  const incomeMinor = totalMinor(entries, "Приход");
  const expenseMinor = totalMinor(entries, "Расход");
  return {
    currency,
    openingBalance: fromMinor(openingMinor),
    income: fromMinor(incomeMinor),
    expense: fromMinor(expenseMinor),
    closingBalance: fromMinor(openingMinor + incomeMinor - expenseMinor),
    entries: entries.map((record) => ({
      record,
      categoryName: names.category(record.categoryId),
      fundName: record.fundId ? names.fund(record.fundId) : undefined,
    })),
    balanceSeries: buildBalanceSeries(entries, openingMinor, period),
    categoryTotals: buildCategoryTotals(entries, names.category),
  };
}

function groupByCurrency(records: FinanceRecord[]): Map<string, FinanceRecord[]> {
  const groups = new Map<string, FinanceRecord[]>();
  for (const record of records) {
    const group = groups.get(record.amount.currency) ?? [];
    group.push(record);
    groups.set(record.amount.currency, group);
  }
  return groups;
}

// period === null → сви записи (почетно стање је 0).
export function buildReport(
  records: FinanceRecord[],
  categories: Category[],
  funds: Fund[],
  period: Period | null,
  generatedAt: Date = new Date(),
  labelOf: (category: Category) => string = (category) => category.name,
): Report {
  const names: NameLookup = {
    category: (id) => {
      const category = categories.find((c) => c.id === id);
      return category ? labelOf(category) : UNKNOWN_CATEGORY;
    },
    fund: (id) => funds.find((f) => f.id === id)?.name ?? UNKNOWN_FUND,
  };
  const groups = groupByCurrency(records);
  const currencies = [...groups.keys()]
    .sort()
    .map((currency) => buildCurrencyReport(currency, groups.get(currency)!, period, names))
    .filter((report): report is CurrencyReport => report !== null);
  return { period, generatedAt, currencies };
}
