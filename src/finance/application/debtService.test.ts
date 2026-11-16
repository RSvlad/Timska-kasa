import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Debt } from "@finance/domain/Debt";
import { isSettled, remainingOf } from "@finance/domain/Debt";

vi.mock("@finance/infrastructure/DebtRepository", () => ({
  createDebt: vi.fn(),
  addDebtRepayment: vi.fn(),
  updateDebt: vi.fn(),
  deactivateDebt: vi.fn(),
}));

import { addDebtRepayment } from "@finance/infrastructure/DebtRepository";
import { debtTotalsByCurrency, repayDebt } from "@finance/application/debtService";

const debt = (over: Partial<Debt> = {}): Debt => ({
  id: "d1",
  direction: "Потраживање",
  counterparty: "Марко",
  amount: { value: 100, currency: "RSD" },
  paid: 0,
  repayments: [],
  active: true,
  authorId: "u1",
  createdAt: new Date(0),
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("remainingOf / isSettled", () => {
  it("рачуна преостало без грешке плутајућег зареза", () => {
    expect(remainingOf(debt({ amount: { value: 0.3, currency: "RSD" }, paid: 0.1 }))).toBe(0.2);
  });

  it("дуг је измирен када је отплаћено цео износ", () => {
    expect(isSettled(debt({ paid: 99.99 }))).toBe(false);
    expect(isSettled(debt({ paid: 100 }))).toBe(true);
  });
});

describe("debtTotalsByCurrency", () => {
  it("збира преостало по валути и смеру; поништене и измирене не рачуна", () => {
    const debts = [
      debt({ amount: { value: 100, currency: "RSD" }, paid: 40 }),
      debt({ direction: "Обавеза", amount: { value: 50, currency: "RSD" } }),
      debt({ amount: { value: 20, currency: "EUR" } }),
      debt({ amount: { value: 70, currency: "EUR" }, paid: 70 }),
      debt({ amount: { value: 999, currency: "RSD" }, active: false }),
    ];
    expect(debtTotalsByCurrency(debts)).toEqual({
      RSD: { receivable: 60, payable: 50 },
      EUR: { receivable: 20, payable: 0 },
    });
  });
});

describe("repayDebt", () => {
  it("одбија неположиван износ", async () => {
    await expect(repayDebt(debt(), 0, "u1")).rejects.toMatchObject({
      detail: { code: "amountNotPositive" },
    });
    expect(addDebtRepayment).not.toHaveBeenCalled();
  });

  it("одбија отплату поништеног дуга", async () => {
    await expect(repayDebt(debt({ active: false }), 10, "u1")).rejects.toMatchObject({
      detail: { code: "notActive" },
    });
  });

  it("одбија отплату већу од преосталог", async () => {
    await expect(repayDebt(debt({ paid: 60 }), 40.01, "u1")).rejects.toMatchObject({
      detail: { code: "overpayment", remaining: 40, currency: "RSD" },
    });
    expect(addDebtRepayment).not.toHaveBeenCalled();
  });

  it("позива репозиторијум када су инваријанте задовољене", async () => {
    await repayDebt(debt({ paid: 60 }), 40, "u1");
    expect(addDebtRepayment).toHaveBeenCalledWith("d1", 40, "u1");
  });
});
