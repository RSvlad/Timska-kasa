import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN,
  VIEWER,
  createVerifiedAdmin,
  createVerifiedViewer,
  resetEmulators,
  seedCategory,
  seedFund,
  seedRecord,
  signIn,
} from "./emulator";

const FUND_NAME = "Путни трошкови";

async function seedData(): Promise<void> {
  await resetEmulators();
  await createVerifiedAdmin();
  await createVerifiedViewer();
  await seedCategory("c-donations", "Донације", "Приход");
  await seedRecord({
    id: "r1",
    type: "Приход",
    value: 1000,
    currency: "RSD",
    dateTime: new Date(2026, 0, 5, 12),
    categoryId: "c-donations",
    counterparty: "Сарадник",
  });
  await seedFund({ id: "f1", name: FUND_NAME, value: 500, currency: "RSD", reserved: 100 });
}

async function openFunds(page: Page, account = ADMIN): Promise<void> {
  await signIn(page, account);
  await page.getByRole("button", { name: "Фондови" }).click();
  await expect(page.getByText(FUND_NAME)).toBeVisible();
}

async function openFundsInEnglish(page: Page, account = ADMIN): Promise<void> {
  await signIn(page, account);
  await page.getByRole("button", { name: "Промени језик: English" }).click();
  await page.getByRole("button", { name: "Funds" }).click();
  await expect(page.getByText(FUND_NAME)).toBeVisible();
}

test.beforeAll(seedData);

test.describe("Фондови — језик", () => {
  test("српски: странице, картица и проценат", async ({ page }) => {
    await openFunds(page);
    await expect(page.getByRole("button", { name: "+ Нови фонд" })).toBeVisible();
    await expect(page.getByText("Алоцирано")).toBeVisible();
    await expect(page.getByText("Слободно у фонду")).toBeVisible();
    await expect(page.getByText("20% попуњено")).toBeVisible();
  });

  test("енглески: картица, акције и проценат", async ({ page }) => {
    await openFundsInEnglish(page);
    await expect(page.getByRole("button", { name: "+ New fund" })).toBeVisible();
    await expect(page.getByText("Allocated")).toBeVisible();
    await expect(page.getByText("Free in fund")).toBeVisible();
    await expect(page.getByText("20% filled")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Allocate" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "− Deallocate" })).toBeEnabled();
  });

  test("енглески: валидација форме за нови фонд", async ({ page }) => {
    await openFundsInEnglish(page);
    await page.getByRole("button", { name: "+ New fund" }).click();
    await expect(page.getByPlaceholder("E.g. Travel expenses")).toBeVisible();

    await page.getByRole("button", { name: "Create fund" }).click();
    await expect(page.getByText("Name is required.")).toBeVisible();

    await page.getByLabel("Name", { exact: true }).fill("Test");
    await page.getByLabel("Capacity", { exact: true }).fill("abc");
    await page.getByRole("button", { name: "Create fund" }).click();
    await expect(
      page.getByText("Capacity must be a positive number (up to 2 decimal places)."),
    ).toBeVisible();

    await page.getByLabel("Capacity", { exact: true }).fill("100");
    await page.getByLabel("Currency", { exact: true }).fill("R");
    await page.getByRole("button", { name: "Create fund" }).click();
    await expect(
      page.getByText("Currency must be a valid 3-letter code (e.g. RSD, EUR)."),
    ).toBeVisible();
  });

  test("енглески: алокација приказује слободна средства, Confirm и Cancel", async ({ page }) => {
    await openFundsInEnglish(page);
    await page.getByRole("button", { name: "+ Allocate" }).click();
    await expect(page.getByText("Allocate (free in Team Fund: 900 RSD)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "+ Allocate" })).toBeVisible();
  });

  test("енглески: дијалог за брисање фонда", async ({ page }) => {
    await openFundsInEnglish(page);
    await page.getByRole("button", { name: "✕" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText(`Delete fund “${FUND_NAME}”?`);
    await expect(dialog).toContainText("This action is permanent.");
    await expect(dialog.getByRole("button", { name: "Delete" })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });

  test("посматрач: нема админ контрола", async ({ page }) => {
    await openFunds(page, VIEWER);
    await expect(page.getByRole("button", { name: "+ Нови фонд" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Алоцирај" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "✕" })).toHaveCount(0);
  });
});
