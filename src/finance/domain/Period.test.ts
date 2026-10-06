import { describe, expect, it } from "vitest";
import { lastDayOf, periodFromDayInputs, toDayInput } from "@finance/domain/Period";

describe("periodFromDayInputs", () => {
  it("укључује крајњи дан: period.to је почетак наредног дана", () => {
    const period = periodFromDayInputs("2026-02-01", "2026-02-28");
    expect(period?.from).toEqual(new Date(2026, 1, 1));
    expect(period?.to).toEqual(new Date(2026, 2, 1));
  });

  it("прихвата период од једног дана", () => {
    const period = periodFromDayInputs("2026-03-15", "2026-03-15");
    expect(period?.to).toEqual(new Date(2026, 2, 16));
  });

  it("одбија непостојећи датум", () => {
    expect(periodFromDayInputs("2026-02-30", "2026-03-05")).toBeNull();
    expect(periodFromDayInputs("2026-03-01", "2026-13-01")).toBeNull();
  });

  it("одбија празну и неисправно форматирану вредност", () => {
    expect(periodFromDayInputs("", "2026-03-05")).toBeNull();
    expect(periodFromDayInputs("2026-03-01", "")).toBeNull();
    expect(periodFromDayInputs("01.03.2026", "05.03.2026")).toBeNull();
  });

  it("одбија почетак после краја", () => {
    expect(periodFromDayInputs("2026-03-06", "2026-03-05")).toBeNull();
  });
});

describe("lastDayOf / toDayInput", () => {
  it("lastDayOf враћа последњи укључени дан", () => {
    const period = periodFromDayInputs("2026-02-10", "2026-02-28")!;
    expect(toDayInput(lastDayOf(period))).toBe("2026-02-28");
  });

  it("toDayInput допуњава месец и дан нулом", () => {
    expect(toDayInput(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
