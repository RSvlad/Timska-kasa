import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createVerifiedAdmin, resetEmulators, seedCategory, seedRecord, signIn } from "./emulator";

type Language = "sr" | "en";

const EXPECTED_FILE_NAMES: Record<Language, string> = {
  sr: "izvestaj_2026-01-01_2026-01-31.pdf",
  en: "report_2026-01-01_2026-01-31.pdf",
};
const EXPECTED_PAGES = 2;
const SWITCH_TO_ENGLISH = "Промени језик: English";

const LABELS = {
  sr: {
    open: /Извештај/,
    dialog: "Извештај",
    custom: "Период",
    from: "Од",
    to: "До",
    create: "Направи PDF",
  },
  en: {
    open: /Report/,
    dialog: "Report",
    custom: "Custom",
    from: "From",
    to: "To",
    create: "Create PDF",
  },
} as const;

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

async function openReportDialog(page: Page, language: Language = "sr") {
  await signIn(page);
  if (language === "en") await page.getByRole("button", { name: SWITCH_TO_ENGLISH }).click();
  const button = page.getByRole("button", { name: LABELS[language].open });
  await expect(button).toBeEnabled();
  await button.click();
  const dialog = page.getByRole("dialog", { name: LABELS[language].dialog });
  await expect(dialog).toBeVisible();
  return dialog;
}

function dateInput(page: Page, label: string) {
  return page.getByRole("dialog").getByLabel(label, { exact: true });
}

async function chooseJanuary(page: Page, language: Language = "sr"): Promise<void> {
  const labels = LABELS[language];
  await page.getByRole("button", { name: labels.custom }).click();
  await dateInput(page, labels.from).fill("2026-01-01");
  await dateInput(page, labels.to).fill("2026-01-31");
}

async function downloadJanuaryReport(page: Page, language: Language): Promise<Download> {
  await openReportDialog(page, language);
  await chooseJanuary(page, language);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: LABELS[language].create }).click(),
  ]);
  return download;
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
    const download = await downloadJanuaryReport(page, "sr");
    expect(download.suggestedFilename()).toBe(EXPECTED_FILE_NAMES.sr);
    expect(await pdfPages(await download.path())).toHaveLength(EXPECTED_PAGES);
  });

  test("PDF садржи ћирилицу и износе по валутама", async ({ page }) => {
    const download = await downloadJanuaryReport(page, "sr");
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

test.describe("Извештај — енглески", () => {
  test("дијалог: наслов, опис и поља периода", async ({ page }) => {
    await openReportDialog(page, "en");
    await expect(dateInput(page, "From")).toHaveCount(0);
    await page.getByRole("button", { name: "Custom" }).click();
    await expect(dateInput(page, "From")).toBeVisible();
    await expect(dateInput(page, "To")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create PDF" })).toBeVisible();
  });

  test("неисправан период приказује енглеску грешку и не преузима фајл", async ({ page }) => {
    await openReportDialog(page, "en");
    await page.getByRole("button", { name: "Custom" }).click();
    await dateInput(page, "From").fill("2026-02-10");
    await dateInput(page, "To").fill("2026-02-01");
    let downloaded = false;
    page.on("download", () => (downloaded = true));
    await page.getByRole("button", { name: "Create PDF" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "start date must not be after the end date",
    );
    expect(downloaded).toBe(false);
  });

  test("PDF има енглеско име фајла и број страна", async ({ page }) => {
    const download = await downloadJanuaryReport(page, "en");
    expect(download.suggestedFilename()).toBe(EXPECTED_FILE_NAMES.en);
    expect(await pdfPages(await download.path())).toHaveLength(EXPECTED_PAGES);
  });

  test("PDF садржи енглеске наслове и износе у en-GB формату", async ({ page }) => {
    const download = await downloadJanuaryReport(page, "en");
    const text = (await pdfPages(await download.path())).join("\n");
    for (const expected of [
      "Team Fund — Report",
      "Currency: EUR",
      "Currency: RSD",
      "Opening balance",
      "Closing balance",
      "Counterparty",
      "Донације",
      "Сарадник",
    ]) {
      expect(text).toContain(expected);
    }
    expect(text).toMatch(/1,299\.5/);
    expect(text).toMatch(/Page 2 \/ 2/);
    expect(text).not.toContain("Извештај");
  });
});
