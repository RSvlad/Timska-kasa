import { describe, expect, it } from "vitest";
import type { Category } from "@finance/domain/Category";
import type { FinanceRecord } from "@finance/domain/FinanceRecord";
import type { Fund } from "@finance/domain/Fund";
import { periodFromDayInputs } from "@finance/domain/Period";
import { buildReport } from "@finance/application/reportService";

let sequence = 0;
const record = (over: Partial<FinanceRecord> = {}): FinanceRecord => ({
  id: `r${++sequence}`,
  type: "Приход",
  amount: { value: 100, currency: "RSD" },
  dateTime: new Date(2026, 1, 10, 12),
  categoryId: "c1",
  counterparty: "X",
  authorId: "u1",
  createdAt: new Date(0),
  ...over,
});

const category = (over: Partial<Category> = {}): Category => ({
  id: "c1",
  name: "Донације",
  type: "Приход",
  active: true,
  system: false,
  ...over,
});

const fund = (over: Partial<Fund> = {}): Fund => ({
  id: "f1",
  name: "Опрема",
  capacity: { value: 100, currency: "RSD" },
  reserved: 0,
  createdAt: new Date(0),
  ...over,
});

const february = periodFromDayInputs("2026-02-01", "2026-02-28")!;
const GENERATED_AT = new Date(2026, 2, 1);
const build = (records: FinanceRecord[], period = february as typeof february | null) =>
  buildReport(records, [category()], [fund()], period, GENERATED_AT);

describe("buildReport: салдо", () => {
  it("почетно стање је нето записа пре периода, а крајње = почетно + приход − расход", () => {
    const report = build([
      record({ amount: { value: 0.1, currency: "RSD" }, dateTime: new Date(2026, 0, 10) }),
      record({ amount: { value: 0.2, currency: "RSD" }, dateTime: new Date(2026, 0, 11) }),
      record({ amount: { value: 10, currency: "RSD" }, dateTime: new Date(2026, 1, 5) }),
      record({
        type: "Расход",
        amount: { value: 0.1, currency: "RSD" },
        dateTime: new Date(2026, 1, 6),
      }),
    ]);
    const [rsd] = report.currencies;
    expect(rsd.openingBalance).toBe(0.3);
    expect(rsd.income).toBe(10);
    expect(rsd.expense).toBe(0.1);
    expect(rsd.closingBalance).toBe(10.2);
  });

  it("без периода почетно стање је 0 и обухваћени су сви записи", () => {
    const report = build(
      [record({ dateTime: new Date(2020, 5, 1) }), record({ dateTime: new Date(2026, 1, 5) })],
      null,
    );
    expect(report.currencies[0].openingBalance).toBe(0);
    expect(report.currencies[0].closingBalance).toBe(200);
  });
});

describe("buildReport: валуте", () => {
  it("валуте се воде засебно и сортирају, без сабирања преко валута", () => {
    const report = build([
      record({ amount: { value: 30, currency: "RSD" } }),
      record({ amount: { value: 5, currency: "EUR" } }),
    ]);
    expect(report.currencies.map((c) => [c.currency, c.closingBalance])).toEqual([
      ["EUR", 5],
      ["RSD", 30],
    ]);
  });

  it("валута само са старијим записима и ненултим салдом се појављује без ставки", () => {
    const report = build([
      record({ amount: { value: 30, currency: "RSD" } }),
      record({ amount: { value: 50, currency: "EUR" }, dateTime: new Date(2026, 0, 3) }),
    ]);
    const eur = report.currencies.find((c) => c.currency === "EUR")!;
    expect(eur.entries).toHaveLength(0);
    expect(eur.openingBalance).toBe(50);
    expect(eur.closingBalance).toBe(50);
  });

  it("валута са нултим салдом и без ставки у периоду се изоставља", () => {
    const report = build([
      record({ amount: { value: 30, currency: "RSD" } }),
      record({ amount: { value: 50, currency: "EUR" }, dateTime: new Date(2026, 0, 3) }),
      record({
        type: "Расход",
        amount: { value: 50, currency: "EUR" },
        dateTime: new Date(2026, 0, 4),
      }),
    ]);
    expect(report.currencies.map((c) => c.currency)).toEqual(["RSD"]);
  });
});

describe("buildReport: границе периода", () => {
  it("почетак је укључен, а крај искључен", () => {
    const report = build([
      record({ dateTime: new Date(2026, 1, 1, 0, 0) }),
      record({ dateTime: new Date(2026, 1, 28, 23, 59) }),
      record({ dateTime: new Date(2026, 2, 1, 0, 0) }),
      record({ dateTime: new Date(2026, 0, 31, 23, 59) }),
    ]);
    const [rsd] = report.currencies;
    expect(rsd.entries).toHaveLength(2);
    expect(rsd.openingBalance).toBe(100);
  });
});

describe("buildReport: серија салда", () => {
  it("почиње почетним стањем, са једном тачком по активном дану (крај дана)", () => {
    const report = build([
      record({ amount: { value: 10, currency: "RSD" }, dateTime: new Date(2026, 0, 20) }),
      record({ amount: { value: 5, currency: "RSD" }, dateTime: new Date(2026, 1, 3, 9) }),
      record({
        type: "Расход",
        amount: { value: 2, currency: "RSD" },
        dateTime: new Date(2026, 1, 3, 18),
      }),
      record({ amount: { value: 1, currency: "RSD" }, dateTime: new Date(2026, 1, 9) }),
    ]);
    expect(report.currencies[0].balanceSeries).toEqual([
      { date: february.from, balance: 10 },
      { date: new Date(2026, 1, 3), balance: 13 },
      { date: new Date(2026, 1, 9), balance: 14 },
    ]);
  });

  it("без периода нема тачке почетног стања", () => {
    const report = build(
      [record({ dateTime: new Date(2026, 1, 3) }), record({ dateTime: new Date(2026, 1, 4) })],
      null,
    );
    expect(report.currencies[0].balanceSeries.map((p) => p.balance)).toEqual([100, 200]);
  });

  it("запис у првом дану периода не стапа се са тачком почетног стања", () => {
    const report = build([record({ dateTime: new Date(2026, 1, 1, 8) })]);
    expect(report.currencies[0].balanceSeries).toHaveLength(2);
  });
});

describe("buildReport: празно и непознато", () => {
  it("празан период нема валутних блокова", () => {
    expect(build([]).currencies).toEqual([]);
    expect(build([record({ dateTime: new Date(2026, 5, 1) })]).currencies).toEqual([]);
  });

  it("непозната категорија и фонд добијају подразумевани назив", () => {
    const report = build([record({ categoryId: "nepoznata", fundId: "nepoznat" })]);
    const [entry] = report.currencies[0].entries;
    expect(entry.categoryName).toBe("—");
    expect(entry.fundName).toBe("Непознат фонд");
  });

  it("запис без фонда нема назив фонда", () => {
    expect(build([record()]).currencies[0].entries[0].fundName).toBeUndefined();
  });
});

describe("buildReport: збирови по категоријама", () => {
  it("раздваја приход и расход исте категорије и сортира опадајуће", () => {
    const report = build([
      record({ amount: { value: 0.1, currency: "RSD" } }),
      record({ amount: { value: 0.2, currency: "RSD" } }),
      record({ type: "Расход", amount: { value: 5, currency: "RSD" } }),
    ]);
    expect(report.currencies[0].categoryTotals).toEqual([
      { categoryName: "Донације", type: "Расход", total: 5 },
      { categoryName: "Донације", type: "Приход", total: 0.3 },
    ]);
  });
});
