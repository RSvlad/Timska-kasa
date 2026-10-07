import { describe, expect, it } from "vitest";
import { detectLocale, LOCALE_STORAGE_KEY, resolveInitialLocale } from "@shared/i18n/locale";

function storageWith(value: string | null): Pick<Storage, "getItem"> {
  return { getItem: (key) => (key === LOCALE_STORAGE_KEY ? value : null) };
}

describe("detectLocale", () => {
  it("препознаје српски по примарном језику", () => {
    expect(detectLocale(["sr-RS"])).toBe("sr");
    expect(detectLocale(["sr-Cyrl-RS"])).toBe("sr");
  });

  it("користи први подржани језик из листе", () => {
    expect(detectLocale(["en-US", "sr"])).toBe("en");
    expect(detectLocale(["de", "sr"])).toBe("sr");
  });

  it("враћа енглески кад ниједан језик није подржан или је листа празна", () => {
    expect(detectLocale(["de"])).toBe("en");
    expect(detectLocale([])).toBe("en");
  });
});

describe("resolveInitialLocale", () => {
  it("сачуван избор има предност над језиком прегледача", () => {
    expect(resolveInitialLocale(storageWith("en"), ["sr-RS"])).toBe("en");
  });

  it("неважећа сачувана вредност пада на детекцију", () => {
    expect(resolveInitialLocale(storageWith("fr"), ["sr-RS"])).toBe("sr");
  });

  it("ради и када је storage недоступан или баца грешку", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(resolveInitialLocale(throwing, ["sr"])).toBe("sr");
    expect(resolveInitialLocale(null, ["de"])).toBe("en");
  });
});
