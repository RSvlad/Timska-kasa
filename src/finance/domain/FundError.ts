// Bounded Context: Finance
// Грешка кршења инваријанти Фонда. Језички неутрална: носи шифру и параметре,
// а текст за корисника гради UI слој.

export type FundErrorDetail =
  | { code: "amountNotPositive" }
  | { code: "notFound" }
  | { code: "capacityExceeded"; max: number; currency: string }
  | { code: "insufficientFreeFunds"; free: number; currency: string }
  | { code: "insufficientReserved"; requested: number; reserved: number; currency: string }
  | { code: "currencyLocked"; reserved: number; currency: string }
  | { code: "capacityBelowReserved"; reserved: number; currency: string }
  | { code: "hasReserved"; reserved: number; currency: string }
  | { code: "referencedByRecords"; count: number };

export type FundErrorCode = FundErrorDetail["code"];

export class FundError extends Error {
  constructor(readonly detail: FundErrorDetail) {
    super(detail.code);
    this.name = "FundError";
  }
}
