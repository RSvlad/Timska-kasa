// Application: операције над Дуговима са провером инваријанти домена.
// Дугови су само евиденција — не мењају салдо касе нити слободна средства (ADR-0006).

import {
  addDebtRepayment,
  createDebt,
  deactivateDebt,
  updateDebt,
  type DebtPatch,
  type NewDebt,
} from "@finance/infrastructure/DebtRepository";
import { fromMinor, toMinor } from "@finance/domain/Amount";
import { remainingOf, type Debt } from "@finance/domain/Debt";
import { DebtError } from "@finance/domain/DebtError";

export interface DebtTotals {
  /** Преостало да нам се врати (Потраживања). */
  receivable: number;
  /** Преостало да каса врати (Обавезе). */
  payable: number;
}

// Преостали (неотплаћени) износи по валути; поништени дугови се не рачунају.
// Нема конверзије међу валутама (ADR-0003).
export function debtTotalsByCurrency(debts: Debt[]): Record<string, DebtTotals> {
  const minor: Record<string, { receivable: number; payable: number }> = {};
  for (const d of debts) {
    if (!d.active) continue;
    const cur = d.amount.currency;
    const bucket = (minor[cur] ??= { receivable: 0, payable: 0 });
    const remaining = toMinor(remainingOf(d));
    if (d.direction === "Потраживање") bucket.receivable += remaining;
    else bucket.payable += remaining;
  }
  const totals: Record<string, DebtTotals> = {};
  for (const cur of Object.keys(minor)) {
    totals[cur] = {
      receivable: fromMinor(minor[cur].receivable),
      payable: fromMinor(minor[cur].payable),
    };
  }
  return totals;
}

export async function addDebt(debt: NewDebt): Promise<string> {
  return createDebt(debt);
}

// Репозиторијум у транзакцији чува: износ ≥ отплаћено и валута се не мења после отплате.
export async function editDebt(id: string, patch: DebtPatch): Promise<void> {
  return updateDebt(id, patch);
}

export async function cancelDebt(id: string): Promise<void> {
  return deactivateDebt(id);
}

/**
 * Бележи отплату `value` на дугу.
 * Баца грешку ако је износ непозитиван, дуг поништен или би отплата прешла преостало.
 */
export async function repayDebt(debt: Debt, value: number, authorId: string): Promise<void> {
  if (value <= 0) throw new DebtError({ code: "amountNotPositive" });
  if (!debt.active) throw new DebtError({ code: "notActive" });
  const remaining = remainingOf(debt);
  if (toMinor(value) > toMinor(remaining)) {
    throw new DebtError({ code: "overpayment", remaining, currency: debt.amount.currency });
  }
  await addDebtRepayment(debt.id, value, authorId);
}
