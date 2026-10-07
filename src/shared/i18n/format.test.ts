import { describe, expect, it } from "vitest";
import { formatAmount, formatCompact } from "@shared/i18n/format";
import { LOCALE_COMPACT_SUFFIXES, LOCALE_FORMAT_TAGS } from "@shared/i18n/locale";

const SR = LOCALE_FORMAT_TAGS.sr;
const EN = LOCALE_FORMAT_TAGS.en;
const SR_SUFFIXES = LOCALE_COMPACT_SUFFIXES.sr;
const EN_SUFFIXES = LOCALE_COMPACT_SUFFIXES.en;

describe("formatAmount", () => {
  it("садржи цифре износа", () => {
    expect(formatAmount(1234.5, "RSD", SR)).toMatch(/1\.?234/);
  });

  it("раздвајање хиљада и децимала прати језик", () => {
    expect(formatAmount(1234.5, "EUR", SR)).toContain("1.234,50");
    expect(formatAmount(1234.5, "EUR", EN)).toContain("1,234.50");
  });

  it("никад не баца изузетак и за неисправну валуту враћа шифру", () => {
    expect(() => formatAmount(10, "12", SR)).not.toThrow();
    expect(formatAmount(10, "12", SR)).toContain("12");
  });
});

describe("formatCompact", () => {
  it("не скраћује износе испод хиљаду", () => {
    expect(formatCompact(999, EN, EN_SUFFIXES)).toBe("999");
  });

  it("скраћује хиљаде и милионе уз суфикс језика", () => {
    expect(formatCompact(1500, EN, EN_SUFFIXES)).toBe("1.5K");
    expect(formatCompact(2_500_000, EN, EN_SUFFIXES)).toBe("2.5M");
    expect(formatCompact(1500, SR, SR_SUFFIXES)).toBe("1,5К");
  });

  it("чува знак негативних износа", () => {
    expect(formatCompact(-1500, EN, EN_SUFFIXES)).toBe("-1.5K");
  });
});
