import { expect, test, type Page } from "@playwright/test";
import {
  createVerifiedAdmin,
  resetEmulators,
  seedCategory,
  seedFund,
  seedRecord,
  signIn,
} from "./emulator";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1);
}

async function seedData(): Promise<void> {
  await resetEmulators();
  await createVerifiedAdmin();
  await seedCategory("c-donations", "Донације", "Приход");
  await seedCategory("c-food", "Храна", "Расход");
  await seedRecord({
    id: "r1",
    type: "Приход",
    value: 1500,
    currency: "RSD",
    dateTime: startOfToday(),
    categoryId: "c-donations",
    counterparty: "Сарадник",
  });
  await seedRecord({
    id: "r2",
    type: "Расход",
    value: 250,
    currency: "RSD",
    dateTime: startOfToday(),
    categoryId: "c-food",
    counterparty: "Добављач",
  });
  await seedFund({ id: "f1", name: "Путни трошкови", value: 500, currency: "RSD", reserved: 100 });
}

async function openDashboard(page: Page): Promise<void> {
  await signIn(page);
  await expect(page.getByText("Сарадник")).toBeVisible();
}

async function openDashboardInEnglish(page: Page): Promise<void> {
  await signIn(page);
  await page.getByRole("button", { name: "Промени језик: English" }).click();
  await expect(page.getByText("Сарадник")).toBeVisible();
}

test.beforeAll(seedData);

test.describe("Дашборд — језик", () => {
  test("српски: картица, период и листа", async ({ page }) => {
    await openDashboard(page);
    const wallet = page.locator(".wallet-card");
    await expect(wallet.getByText("Слободно", { exact: true })).toBeVisible();
    await expect(wallet.getByText("Алоцирано", { exact: true })).toBeVisible();
    await expect(wallet.getByText("Приходи", { exact: true })).toBeVisible();
    await expect(wallet.getByText("Расходи", { exact: true })).toBeVisible();
    await expect(wallet.locator(".wallet-balance")).toContainText(/1\.250/);
    await expect(page.getByText("Трансакције", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "📄 Извештај" })).toBeEnabled();
    for (const tab of ["Данас", "Месец", "Година", "Све"]) {
      await expect(page.getByRole("button", { name: tab, exact: true })).toBeVisible();
    }
    await expect(page.getByText("+1,5К", { exact: true })).toBeVisible();
    await expect(page.getByText("−250", { exact: true })).toBeVisible();
  });

  test("енглески: картица, период и листа", async ({ page }) => {
    await openDashboardInEnglish(page);
    const wallet = page.locator(".wallet-card");
    await expect(wallet.getByText("Free", { exact: true })).toBeVisible();
    await expect(wallet.getByText("Allocated", { exact: true })).toBeVisible();
    await expect(wallet.getByText("Income", { exact: true })).toBeVisible();
    await expect(wallet.getByText("Expenses", { exact: true })).toBeVisible();
    await expect(wallet.locator(".wallet-balance")).toContainText(/1,250/);
    await expect(wallet.locator(".wallet-reserved-row")).toContainText(/1,150/);
    await expect(page.getByText("Transactions", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "📄 Report" })).toBeEnabled();
    for (const tab of ["Today", "Month", "Year", "All"]) {
      await expect(page.getByRole("button", { name: tab, exact: true })).toBeVisible();
    }
    await expect(page.getByText("+1.5K", { exact: true })).toBeVisible();
    await expect(page.getByText("−250", { exact: true })).toBeVisible();
  });

  test("енглески: филтери — ознаке, типови и празно стање", async ({ page }) => {
    await openDashboardInEnglish(page);
    await page.getByText("Filters", { exact: true }).click();
    const type = page.getByLabel("Type", { exact: true });
    const category = page.getByLabel("Category", { exact: true });
    await expect(type).toContainText("All");
    await expect(type).toContainText("Income");
    await expect(type).toContainText("Expense");
    await expect(category).toContainText("Донације (Income)");
    await expect(category).toContainText("Храна (Expense)");

    await type.selectOption({ label: "Expense" });
    await expect(page.getByText("Добављач")).toBeVisible();
    await expect(page.getByText("Сарадник")).toHaveCount(0);

    await category.selectOption({ label: "Донације (Income)" });
    await expect(page.getByText("No transactions for the selected period.")).toBeVisible();
  });

  test("повратак на српски без заосталих енглеских текстова", async ({ page }) => {
    await openDashboardInEnglish(page);
    await page.getByRole("button", { name: "Change language: Српски" }).click();
    await expect(page.getByText("Трансакције", { exact: true })).toBeVisible();
    await expect(page.getByText("Transactions", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Today", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Данас", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "📄 Извештај" })).toBeVisible();
  });
});
