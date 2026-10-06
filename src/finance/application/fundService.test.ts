import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Fund } from "@finance/domain/Fund";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";

vi.mock("@finance/infrastructure/FundRepository", () => ({
  createFund: vi.fn(),
  adjustFundReserved: vi.fn(),
  updateFund: vi.fn(),
  deleteFund: vi.fn(),
}));

import { adjustFundReserved, deleteFund } from "@finance/infrastructure/FundRepository";
import {
  freeBalanceByCurrency,
  releaseFromFund,
  removeFund,
  reserveIntoFund,
} from "@finance/application/fundService";

const fund = (over: Partial<Fund> = {}): Fund => ({
  id: "f1",
  name: "Опрема",
  capacity: { value: 100, currency: "RSD" },
  reserved: 0,
  createdAt: new Date(0),
  ...over,
});

const record = (over: Partial<FinanceRecord> = {}): FinanceRecord => ({
  id: "r1",
  type: "Приход",
  amount: { value: 100, currency: "RSD" },
  dateTime: new Date(0),
  categoryId: "c1",
  counterparty: "X",
  authorId: "u1",
  createdAt: new Date(0),
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("freeBalanceByCurrency", () => {
  it("сабира приходе, одузима расходе и алоцирано по валути", () => {
    const records = [
      record({ amount: { value: 0.1, currency: "RSD" } }),
      record({ amount: { value: 0.2, currency: "RSD" } }),
      record({ type: "Расход", amount: { value: 0.1, currency: "RSD" } }),
      record({ amount: { value: 50, currency: "EUR" } }),
    ];
    const funds = [fund({ reserved: 0.05 })];
    expect(freeBalanceByCurrency(records, funds)).toEqual({ RSD: 0.15, EUR: 50 });
  });
});

describe("reserveIntoFund", () => {
  const records = [record({ amount: { value: 80, currency: "RSD" } })];

  it("одбија неположиван износ", async () => {
    await expect(reserveIntoFund(fund(), 0, records, [fund()])).rejects.toThrow();
    expect(adjustFundReserved).not.toHaveBeenCalled();
  });

  it("одбија прекорачење капацитета", async () => {
    await expect(reserveIntoFund(fund(), 101, records, [fund()])).rejects.toThrow(/капацитет/);
  });

  it("одбија алокацију веће од слободне касе", async () => {
    await expect(reserveIntoFund(fund(), 90, records, [fund()])).rejects.toThrow(/слободн/);
  });

  it("позива репозиторијум када су инваријанте задовољене", async () => {
    await reserveIntoFund(fund(), 60, records, [fund()]);
    expect(adjustFundReserved).toHaveBeenCalledWith("f1", 60);
  });
});

describe("releaseFromFund", () => {
  it("одбија износ већи од алокираног", async () => {
    await expect(releaseFromFund(fund({ reserved: 10 }), 10.01)).rejects.toThrow();
    expect(adjustFundReserved).not.toHaveBeenCalled();
  });

  it("враћа средства негативном делтом", async () => {
    await releaseFromFund(fund({ reserved: 10 }), 4);
    expect(adjustFundReserved).toHaveBeenCalledWith("f1", -4);
  });
});

describe("removeFund", () => {
  it("одбија брисање ако га записи референцирају", async () => {
    await expect(removeFund(fund(), [record({ fundId: "f1" })])).rejects.toThrow(/референцира/);
    expect(deleteFund).not.toHaveBeenCalled();
  });

  it("брише нереферисан фонд", async () => {
    await removeFund(fund(), [record({ fundId: "other" })]);
    expect(deleteFund).toHaveBeenCalledWith("f1");
  });
});
