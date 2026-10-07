// Application: операције над Фондовима са провером инваријанти домена.
// Инваријанте (видети Fund.ts):
//   1. reserved >= 0
//   2. reserved <= capacity.value
//   3. При повећању: delta ≤ слободна_каса_у_датој_валути

import {
  createFund,
  adjustFundReserved,
  updateFund,
  deleteFund,
  type NewFund,
} from "@finance/infrastructure/FundRepository";
import type { Fund } from "@finance/domain/Fund";
import { FundError } from "@finance/domain/FundError";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import { toMinor, fromMinor } from "@finance/domain/Amount";

// Слободна средства у тимској каси по валути = салдо − Σ reserved фондова те валуте.
export function freeBalanceByCurrency(
  records: FinanceRecord[],
  funds: Fund[],
): Record<string, number> {
  // Акумулација у целобројним стотинкама (без грешке плутајућег зареза).
  const minor: Record<string, number> = {};
  for (const r of records) {
    const cur = r.amount.currency;
    if (!minor[cur]) minor[cur] = 0;
    if (r.type === "Приход") minor[cur] += toMinor(r.amount.value);
    else minor[cur] -= toMinor(r.amount.value);
  }
  // одузми алоцирано из фондова
  for (const f of funds) {
    const cur = f.capacity.currency;
    if (!minor[cur]) minor[cur] = 0;
    minor[cur] -= toMinor(f.reserved);
  }
  const balance: Record<string, number> = {};
  for (const cur of Object.keys(minor)) balance[cur] = fromMinor(minor[cur]);
  return balance;
}

export async function addFund(fund: NewFund): Promise<string> {
  return createFund(fund);
}

export async function editFund(
  id: string,
  patch: Partial<Pick<Fund, "name" | "description" | "capacity">>,
): Promise<void> {
  return updateFund(id, patch);
}

// Брисање је забрањено док фонд има алоцирано (проверава репозиторијум у транзакцији)
// или док га референцирају записи (да не заостану сирочад `fundId`).
export async function removeFund(fund: Fund, records: FinanceRecord[]): Promise<void> {
  const refs = records.filter((r) => r.fundId === fund.id).length;
  if (refs > 0) throw new FundError({ code: "referencedByRecords", count: refs });
  return deleteFund(fund.id);
}

/**
 * Додаје `delta` у фонд (алокација).
 * Баца грешку ако би алоцирано прешло капацитет или ако у каси нема довољно слободних средстава.
 */
export async function reserveIntoFund(
  fund: Fund,
  delta: number,
  records: FinanceRecord[],
  allFunds: Fund[],
): Promise<void> {
  if (delta <= 0) throw new FundError({ code: "amountNotPositive" });
  const newReserved = fromMinor(toMinor(fund.reserved) + toMinor(delta));
  const currency = fund.capacity.currency;
  if (newReserved > fund.capacity.value) {
    const max = fromMinor(toMinor(fund.capacity.value) - toMinor(fund.reserved));
    throw new FundError({ code: "capacityExceeded", max, currency });
  }
  const free = freeBalanceByCurrency(records, allFunds)[currency] ?? 0;
  if (delta > free) throw new FundError({ code: "insufficientFreeFunds", free, currency });
  await adjustFundReserved(fund.id, delta);
}

/**
 * Враћа `delta` из фонда назад у слободна средства тимске касе.
 * Баца грешку ако би reserved пао испод нуле.
 */
export async function releaseFromFund(fund: Fund, delta: number): Promise<void> {
  if (delta <= 0) throw new FundError({ code: "amountNotPositive" });
  const newReserved = fromMinor(toMinor(fund.reserved) - toMinor(delta));
  if (newReserved < 0) {
    const { reserved, capacity } = fund;
    throw new FundError({
      code: "insufficientReserved",
      requested: delta,
      reserved,
      currency: capacity.currency,
    });
  }
  await adjustFundReserved(fund.id, -delta);
}
