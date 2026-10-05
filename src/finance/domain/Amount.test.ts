import { describe, expect, it } from "vitest";
import {
  MAX_AMOUNT,
  formatAmount,
  fromMinor,
  isValidCurrency,
  normalizeCurrency,
  parseAmountInput,
  toMinor,
} from "@finance/domain/Amount";

describe("parseAmountInput", () => {
  it("прихвата тачку и зарез као децимални сепаратор", () => {
    expect(parseAmountInput("10.5")).toBe(10.5);
    expect(parseAmountInput("10,5")).toBe(10.5);
    expect(parseAmountInput(" 100 ")).toBe(100);
  });

  it("одбија више од две децимале, нулу и негативне вредности", () => {
    expect(parseAmountInput("1.234")).toBeNull();
    expect(parseAmountInput("0")).toBeNull();
    expect(parseAmountInput("-5")).toBeNull();
  });

  it("одбија нумерички шум", () => {
    for (const s of ["", "abc", "0x10", "1e21", "Infinity", "NaN", "1,2,3"]) {
      expect(parseAmountInput(s)).toBeNull();
    }
  });

  it("поштује MAX_AMOUNT", () => {
    expect(parseAmountInput(String(MAX_AMOUNT))).toBe(MAX_AMOUNT);
    expect(parseAmountInput(String(MAX_AMOUNT + 1))).toBeNull();
  });
});

describe("валута", () => {
  it("normalizeCurrency тримује и подиже у велика слова", () => {
    expect(normalizeCurrency("  rsd ")).toBe("RSD");
  });

  it("isValidCurrency", () => {
    expect(isValidCurrency("rsd")).toBe(true);
    expect(isValidCurrency("EUR")).toBe(true);
    expect(isValidCurrency("EU")).toBe(false);
    expect(isValidCurrency("EURO")).toBe(false);
    expect(isValidCurrency("12$")).toBe(false);
  });
});

describe("минорне јединице", () => {
  it("избегава грешку плутајућег зареза", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(fromMinor(toMinor(0.1) + toMinor(0.2))).toBe(0.3);
  });

  it("toMinor/fromMinor су међусобно инверзни за износе са ≤2 децимале", () => {
    for (const v of [0, 0.01, 1.15, 19.99, 1234567.89]) {
      expect(fromMinor(toMinor(v))).toBe(v);
    }
  });
});

describe("formatAmount", () => {
  it("садржи цифре износа", () => {
    expect(formatAmount(1234.5, "RSD")).toMatch(/1\.?234/);
  });

  it("никад не баца изузетак и за неисправну валуту враћа шифру", () => {
    expect(() => formatAmount(10, "12")).not.toThrow();
    expect(formatAmount(10, "12")).toContain("12");
  });
});
