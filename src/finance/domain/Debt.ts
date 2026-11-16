// Bounded Context: Finance
// Entity: Дуг — евиденција новца који неко дугује Тимској каси (Потраживање)
// или који Тимска каса дугује другима (Обавеза). Видети ADR-0006.
// Дуг је само евиденција: НЕ утиче на салдо касе нити на слободна средства.

import { fromMinor, toMinor, type Amount } from "@finance/domain/Amount";

export type DebtDirection = "Потраживање" | "Обавеза";

export interface DebtRepayment {
  readonly value: number; // у валути дуга; > 0
  readonly dateTime: Date;
  readonly authorId: string; // Firebase UID Администратора
}

export interface Debt {
  readonly id: string;
  readonly direction: DebtDirection; // непромењиво после креирања
  readonly counterparty: string;
  readonly amount: Amount; // првобитни износ дуга
  readonly paid: number; // збир отплата; 0 ≤ paid ≤ amount.value
  readonly repayments: readonly DebtRepayment[]; // историја отплата (audit trail)
  readonly description?: string;
  readonly active: boolean; // меко брисање (ADR-0004): false = поништен унос
  readonly authorId: string; // Firebase UID Администратора
  readonly createdAt: Date;
}

// Инваријанте (проверава application слој; 1–2 и валуту дуга чувају и Firestore rules):
// 1. 0 ≤ paid ≤ amount.value
// 2. direction, authorId и createdAt се не мењају
// 3. Отплата је позитивна, не прелази преостало и није дозвољена на поништеном дугу
// 4. Валута се не мења када је већ било отплате; износ не може пасти испод paid

export function remainingOf(debt: Pick<Debt, "amount" | "paid">): number {
  return fromMinor(toMinor(debt.amount.value) - toMinor(debt.paid));
}

export function isSettled(debt: Pick<Debt, "amount" | "paid">): boolean {
  return remainingOf(debt) <= 0;
}
