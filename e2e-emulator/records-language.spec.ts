import { expect, test, type Page } from "@playwright/test";
import {
  createVerifiedAdmin,
  resetEmulators,
  seedCategory,
  seedFund,
  seedRecord,
  signIn,
} from "./emulator";

async function seedData(): Promise<void> {
  await resetEmulators();
  await createVerifiedAdmin();
  await seedCategory("c-donations", "Донације", "Приход");
  await seedCategory("c-old", "Стара", "Расход", false);
  await seedRecord({
    id: "r1",
    type: "Приход",
    value: 1000,
    currency: "RSD",
    dateTime: new Date(2026, 0, 5, 12),
    categoryId: "c-donations",
    counterparty: "Сарадник",
    receiptPath: "receipts/r1.jpg",
  });
  await seedRecord({
    id: "r2",
    type: "Расход",
    value: 250,
    currency: "RSD",
    dateTime: new Date(2026, 0, 4, 12),
    categoryId: "c-old",
    counterparty: "Добављач",
  });
  await seedRecord({
    id: "r3",
    type: "Приход",
    value: 75,
    currency: "RSD",
    dateTime: new Date(2026, 0, 3, 12),
    categoryId: "system-unknown-income",
    counterparty: "Непознат давалац",
  });
  await seedFund({ id: "f1", name: "Путни трошкови", value: 500, currency: "RSD", reserved: 100 });
}

async function openRecords(page: Page): Promise<void> {
  await signIn(page);
  await page.getByRole("button", { name: "≡ Записи", exact: true }).click();
  await expect(page.getByText("Сарадник")).toBeVisible();
}

async function openRecordsInEnglish(page: Page): Promise<void> {
  await signIn(page);
  await page.getByRole("button", { name: "Промени језик: English" }).click();
  await page.getByRole("button", { name: "≡ Records", exact: true }).click();
  await expect(page.getByText("Сарадник")).toBeVisible();
}

test.beforeAll(seedData);

test.describe("Записи — језик", () => {
  test("српски: наслов, дугме, листа и деактивирана категорија", async ({ page }) => {
    await openRecords(page);
    await expect(page.getByText("Сви записи")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Нови запис" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Уреди", exact: true })).toHaveCount(3);
    await expect(page.getByRole("link", { name: "🧾 рачун" })).toBeVisible();
    await expect(page.getByText("Стара (деактивирана)")).toBeVisible();
    await expect(page.getByText("+1.000 RSD")).toBeVisible();
  });

  test("енглески: наслов, дугме, листа и деактивирана категорија", async ({ page }) => {
    await openRecordsInEnglish(page);
    await expect(page.getByText("All records")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ New record" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(3);
    await expect(page.getByRole("link", { name: "🧾 receipt" })).toBeVisible();
    await expect(page.getByText("Стара (inactive)")).toBeVisible();
    await expect(page.getByText("+1,000 RSD")).toBeVisible();
  });

  test("енглески: форма — ознаке, избор и фонд за расход", async ({ page }) => {
    await openRecordsInEnglish(page);
    await page.getByRole("button", { name: "+ New record" }).click();
    await expect(page.getByRole("button", { name: "✕ Close" })).toBeVisible();
    await expect(page.getByRole("button", { name: "↑ Income" })).toBeVisible();
    await expect(page.getByRole("button", { name: "↓ Expense" })).toBeVisible();
    for (const label of ["Amount", "Currency", "Category", "Date and time", "Counterparty"]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByPlaceholder("E.g. Acme Ltd.")).toBeVisible();
    await expect(page.getByLabel("Category", { exact: true })).toContainText("— Select —");

    await page.getByRole("button", { name: "↓ Expense" }).click();
    const fund = page.getByRole("combobox", { name: /^Fund/ });
    await expect(fund).toContainText("— Team Fund —");
    await expect(
      page.getByText("(optional — charges the fund instead of the Team Fund)"),
    ).toBeVisible();
  });

  test("системска категорија: српски приказ", async ({ page }) => {
    await openRecords(page);
    await expect(page.getByText("Непознат давалац")).toBeVisible();
    await expect(page.getByText("Непознато", { exact: true })).toBeVisible();
    await expect(page.getByText("Unknown", { exact: true })).toHaveCount(0);
  });

  test("системска категорија: енглески приказ", async ({ page }) => {
    await openRecordsInEnglish(page);
    await expect(page.getByText("Непознат давалац")).toBeVisible();
    await expect(page.getByText("Unknown", { exact: true })).toBeVisible();
    await expect(page.getByText("Непознато", { exact: true })).toHaveCount(0);
  });

  test("енглески: валидација форме", async ({ page }) => {
    await openRecordsInEnglish(page);
    await page.getByRole("button", { name: "+ New record" }).click();
    const add = page.getByRole("button", { name: "Add record" });

    await add.click();
    await expect(
      page.getByText("Amount must be a positive number (up to 2 decimal places)."),
    ).toBeVisible();

    await page.getByLabel("Amount", { exact: true }).fill("100");
    await page.getByLabel("Currency", { exact: true }).fill("R");
    await add.click();
    await expect(
      page.getByText("Currency must be a valid 3-letter code (e.g. RSD, EUR)."),
    ).toBeVisible();

    await page.getByLabel("Currency", { exact: true }).fill("RSD");
    await add.click();
    await expect(page.getByText("Category is required.")).toBeVisible();

    await page.getByLabel("Category", { exact: true }).selectOption({ label: "Донације" });
    await add.click();
    await expect(page.getByText("Counterparty is required.")).toBeVisible();
  });

  test("повратак на српски без заосталих енглеских текстова", async ({ page }) => {
    await openRecordsInEnglish(page);
    await page.getByRole("button", { name: "Change language: Српски" }).click();
    await expect(page.getByText("Сви записи")).toBeVisible();
    await expect(page.getByText("All records")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Нови запис" })).toBeVisible();
    await expect(page.getByText("Стара (деактивирана)")).toBeVisible();
  });
});
