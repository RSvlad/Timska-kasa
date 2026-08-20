// Application: операције над Фондовима са провером инваријанти домена.
// Инваријанте (видети Fund.ts):
//   1. reserved >= 0
//   2. reserved <= capacity.value
//   3. При повећању: delta ≤ слободна_каса_у_датој_валути

import {
  createFund,
  updateFundReserved,
  updateFund,
  deleteFund,
  type NewFund,
} from "@finance/infrastructure/FundRepository";
import type { Fund } from "@finance/domain/Fund";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";

// Слободна средства у тимској каси по валути = салдо − Σ reserved фондова те валуте.
export function freeBalanceByCurrency(
  records: FinanceRecord[],
  funds: Fund[]
): Record<string, number> {
  const balance: Record<string, number> = {};
  for (const r of records) {
    const cur = r.amount.currency;
    if (!balance[cur]) balance[cur] = 0;
    if (r.type === "Приход") balance[cur] += r.amount.value;
    else                     balance[cur] -= r.amount.value;
  }
  // одузми алоцирано из фондова
  for (const f of funds) {
    const cur = f.capacity.currency;
    if (!balance[cur]) balance[cur] = 0;
    balance[cur] -= f.reserved;
  }
  return balance;
}

export async function addFund(fund: NewFund): Promise<string> {
  return createFund(fund);
}

export async function editFund(
  id: string,
  patch: Partial<Pick<Fund, "name" | "description" | "capacity">>
): Promise<void> {
  return updateFund(id, patch);
}

export async function removeFund(id: string): Promise<void> {
  return deleteFund(id);
}

/**
 * Додаје `delta` у фонд (алокација).
 * Баца грешку ако би алоцирано прешло капацитет или ако у каси нема довољно слободних средстава.
 */
export async function reserveIntoFund(
  fund: Fund,
  delta: number,
  records: FinanceRecord[],
  allFunds: Fund[]
): Promise<void> {
  if (delta <= 0) throw new Error("Износ мора бити позитиван.");
  const newReserved = fund.reserved + delta;
  if (newReserved > fund.capacity.value)
    throw new Error(
      `Прелази капацитет фонда (макс. ${fund.capacity.value - fund.reserved} ${fund.capacity.currency}).`
    );
  const free = freeBalanceByCurrency(records, allFunds);
  const freeCur = free[fund.capacity.currency] ?? 0;
  if (delta > freeCur)
    throw new Error(
      `Нема довољно слободних средстава у тимској каси (слободно: ${freeCur} ${fund.capacity.currency}).`
    );
  await updateFundReserved(fund.id, newReserved);
}

/**
 * Враћа `delta` из фонда назад у слободна средства тимске касе.
 * Баца грешку ако би reserved пао испод нуле.
 */
export async function releaseFromFund(fund: Fund, delta: number): Promise<void> {
  if (delta <= 0) throw new Error("Износ мора бити позитиван.");
  const newReserved = fund.reserved - delta;
  if (newReserved < 0)
    throw new Error(
      `Не може се дезалоцирати ${delta} — тренутно алоцирано само ${fund.reserved} ${fund.capacity.currency}.`
    );
  await updateFundReserved(fund.id, newReserved);
}
