// Bounded Context: Finance
// Read model: Извештај — прегледни извод Финансијских записа за период, без перзистенције.
// Свака валута има засебан извештај; салдо се никад не сабира преко валута.

import type { RecordType } from "@finance/domain/Category";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { Period } from "@finance/domain/Period";

export interface BalancePoint {
  readonly date: Date; // почетак дана
  readonly balance: number; // салдо на крају тог дана
}

export interface CategoryTotal {
  readonly categoryName: string;
  readonly type: RecordType;
  readonly total: number;
}

export interface ReportEntry {
  readonly record: FinanceRecord;
  readonly categoryName: string;
  readonly fundName?: string;
}

export interface CurrencyReport {
  readonly currency: string;
  readonly openingBalance: number;
  readonly income: number;
  readonly expense: number;
  readonly closingBalance: number;
  readonly entries: readonly ReportEntry[]; // хронолошки
  readonly balanceSeries: readonly BalancePoint[];
  readonly categoryTotals: readonly CategoryTotal[];
}

export interface Report {
  readonly period: Period | null; // null = сви записи
  readonly generatedAt: Date;
  readonly currencies: readonly CurrencyReport[];
}
