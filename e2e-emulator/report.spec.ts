import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { ADMIN, createVerifiedAdmin, resetEmulators, seedCategory, seedRecord } from "./emulator";

const EXPECTED_FILE_NAME = "izvestaj_2026-01-01_2026-01-31.pdf";
const EXPECTED_PAGES = 2;

async function seedData(): Promise<void> {
  await resetEmulators();
  await createVerifiedAdmin();
  await seedCategory("c-donations", "Донације", "Приход");
  await seedCategory("c-equipment", "Опрема", "Расход");
  const base = { categoryId: "c-donations", counterparty: "Сарадник" } as const;
  await seedRecord({
    ...base,
    id: "r1",
    type: "Приход",
    value: 1000,
    currency: "RSD",
    dateTime: new Date(2025, 11, 20, 12),
  });
  await seedRecord({
    ...base,
    id: "r2",
    type: "Приход",
    value: 500,
    currency: "RSD",
    dateTime: new Date(2026, 0, 5, 12),
  });
  await seedRecord({
    ...base,
    id: "r3",
    type: "Расход",
    value: 200.5,
    currency: "RSD",
    dateTime: new Date(2026, 0, 10, 12),
    categoryId: "c-equipment",
  });
  await seedRecord({
    ...base,
    id: "r4",
    type: "Приход",
    value: 50,
    currency: "EUR",
    dateTime: new Date(2026, 0, 12, 12),
  });
}

async function signIn(page: Page): Promise<void> {
  await page.goto("./");
  await page.waitForFunction(() => "__e2eSignIn" in window);
  await page.evaluate(
    ([email, password]) =>
      (window as unknown as { __e2eSignIn: (e: string, p: string) => Promise<void> }).__e2eSignIn(
        email,
        password,
      ),
    [ADMIN.email, ADMIN.password],
  );
}

async function openReportDialog(page: Page) {
  await signIn(page);
  const button = page.getByRole("button", { name: /Извештај/ });
  await expect(button).toBeEnabled();
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Извештај" });
  await expect(dialog).toBeVisible();
  return dialog;
}

function dateInput(page: Page, label: "Од" | "До") {
  return page.getByRole("dialog").getByLabel(label, { exact: true });
}

async function chooseJanuary(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Период" }).click();
  await dateInput(page, "Од").fill("2026-01-01");
  await dateInput(page, "До").fill("2026-01-31");
}

async function pdfPages(path: string): Promise<string[]> {
  const data = new Uint8Array(await readFile(path));
  const pdf = await getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages;
}

test.beforeAll(seedData);

test.describe("Извештај", () => {
  test("дугме отвара дијалог, Escape га затвара, а „Период“ приказује датуме", async ({ page }) => {
    const dialog = await openReportDialog(page);
    await expect(dateInput(page, "Од")).toHaveCount(0);
    await page.getByRole("button", { name: "Период" }).click();
    await expect(dateInput(page, "Од")).toBeVisible();
    await expect(dateInput(page, "До")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("неисправан период приказује грешку и не преузима фајл", async ({ page }) => {
    await openReportDialog(page);
    await page.getByRole("button", { name: "Период" }).click();
    await dateInput(page, "Од").fill("2026-02-10");
    await dateInput(page, "До").fill("2026-02-01");
    let downloaded = false;
    page.on("download", () => (downloaded = true));
    await page.getByRole("button", { name: "Направи PDF" }).click();
    await expect(page.getByRole("alert")).toContainText("почетни датум не сме бити после крајњег");
    expect(downloaded).toBe(false);
  });

  test("PDF се преузима са очекиваним именом и бројем страна", async ({ page }) => {
    await openReportDialog(page);
    await chooseJanuary(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Направи PDF" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(EXPECTED_FILE_NAME);
    const path = await download.path();
    expect(await pdfPages(path)).toHaveLength(EXPECTED_PAGES);
  });

  test("PDF садржи ћирилицу и износе по валутама", async ({ page }) => {
    await openReportDialog(page);
    await chooseJanuary(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Направи PDF" }).click(),
    ]);
    const text = (await pdfPages(await download.path())).join("\n");
    for (const expected of [
      "Тимска каса — Извештај",
      "Валута: EUR",
      "Валута: RSD",
      "Донације",
      "Опрема",
      "Сарадник",
    ]) {
      expect(text).toContain(expected);
    }
    expect(text).toMatch(/1\.299,5 RSD/);
    expect(text).toMatch(/Страна 2 \/ 2/);
  });

  test("мобилни приказ: дијалог стаје у екран, а датуми су један испод другог", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "само за мобилни viewport");
    const dialog = await openReportDialog(page);
    await page.getByRole("button", { name: "Период" }).click();
    const viewport = page.viewportSize()!;
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    const from = (await dateInput(page, "Од").boundingBox())!;
    const to = (await dateInput(page, "До").boundingBox())!;
    expect(to.y).toBeGreaterThan(from.y + from.height - 1);
  });
});
