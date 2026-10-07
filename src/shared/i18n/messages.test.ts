import { describe, expect, it } from "vitest";
import { defineMessages, translate } from "@shared/i18n/messages";

const messages = defineMessages({
  sr: { hello: "Здраво", denied: "Налог {email} нема приступ ({count})" },
  en: { hello: "Hello", denied: "Account {email} has no access ({count})" },
});

describe("translate", () => {
  it("враћа текст за изабрани језик", () => {
    expect(translate(messages, "sr", "hello")).toBe("Здраво");
    expect(translate(messages, "en", "hello")).toBe("Hello");
  });

  it("замењује параметре, укључујући бројеве", () => {
    expect(translate(messages, "en", "denied", { email: "a@b.rs", count: 2 })).toBe(
      "Account a@b.rs has no access (2)",
    );
  });

  it("оставља непознат placeholder непромењен", () => {
    expect(translate(messages, "sr", "denied", { email: "a@b.rs" })).toBe(
      "Налог a@b.rs нема приступ ({count})",
    );
  });
});
