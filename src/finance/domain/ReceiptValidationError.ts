// Bounded Context: Finance
// Грешка валидације слике рачуна. Језички неутрална: носи шифру и параметре,
// а текст за корисника гради UI слој.

export type ReceiptValidationDetail =
  { code: "unsupportedFormat" } | { code: "tooLarge"; maxMb: number };

export class ReceiptValidationError extends Error {
  constructor(readonly detail: ReceiptValidationDetail) {
    super(detail.code);
    this.name = "ReceiptValidationError";
  }
}
