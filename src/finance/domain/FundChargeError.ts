// Bounded Context: Finance
// Грешка кршења правила терећења Фонда расходом. Језички неутрална: носи шифру
// и параметре, а текст за корисника гради UI слој.

export type FundChargeErrorDetail =
  | { code: "expenseOnly" }
  | { code: "fundNotFound" }
  | { code: "currencyMismatch"; currency: string }
  | { code: "insufficientReserved"; reserved: number; currency: string }
  | { code: "capacityExceeded" };

export type FundChargeErrorCode = FundChargeErrorDetail["code"];

export class FundChargeError extends Error {
  constructor(readonly detail: FundChargeErrorDetail) {
    super(detail.code);
    this.name = "FundChargeError";
  }
}
