// Bounded Context: Finance
// Грешка кршења инваријанти Дуга. Језички неутрална: носи шифру и параметре,
// а текст за корисника гради UI слој.

export type DebtErrorDetail =
  | { code: "amountNotPositive" }
  | { code: "notFound" }
  | { code: "notActive" }
  | { code: "overpayment"; remaining: number; currency: string }
  | { code: "amountBelowPaid"; paid: number; currency: string }
  | { code: "currencyLocked"; paid: number; currency: string };

export type DebtErrorCode = DebtErrorDetail["code"];

export class DebtError extends Error {
  constructor(readonly detail: DebtErrorDetail) {
    super(detail.code);
    this.name = "DebtError";
  }
}
