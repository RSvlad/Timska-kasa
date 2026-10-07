import { describe, expect, it, vi } from "vitest";
import type { Category } from "@finance/domain/Category";

vi.mock("firebase/firestore", () => ({ doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn() }));
vi.mock("@shared/infrastructure/firebase", () => ({ db: {} }));

import { categoryLabel } from "@finance/application/categoryLabel";
import { SYSTEM_CATEGORIES } from "@finance/infrastructure/seedSystemCategories";

const category = (over: Partial<Category> = {}): Category => ({
  id: "c1",
  name: "Донације",
  type: "Приход",
  active: true,
  system: false,
  ...over,
});

const systemCategory = (id: string, type: Category["type"]): Category =>
  category({ id, name: "Непознато", type, system: true });

describe("categoryLabel", () => {
  it.each([
    ["system-unknown-income", "Приход"],
    ["system-unknown-expense", "Расход"],
  ] as const)("translates %s per locale", (id, type) => {
    expect(categoryLabel(systemCategory(id, type), "sr")).toBe("Непознато");
    expect(categoryLabel(systemCategory(id, type), "en")).toBe("Unknown");
  });

  it("shows the stored name of a user category in every locale", () => {
    expect(categoryLabel(category(), "sr")).toBe("Донације");
    expect(categoryLabel(category(), "en")).toBe("Донације");
  });

  it("does not translate a user category that only has the same name", () => {
    expect(categoryLabel(category({ name: "Непознато" }), "en")).toBe("Непознато");
  });

  it("covers every seeded system category with an English label", () => {
    for (const { id, name, type } of SYSTEM_CATEGORIES) {
      const seeded = category({ id, name, type, system: true });
      expect(categoryLabel(seeded, "en")).not.toBe(name);
    }
  });
});
