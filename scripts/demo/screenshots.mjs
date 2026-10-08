// Прави 1080×1920 снимке екрана кључних страница (српски и енглески) над демо подацима.
// Покреће се преко: npm run demo:screenshots  (подиже Firebase емулаторе, гради апликацију,
// пуни демо подацима из seed.mjs и снима у docs/screenshots/{sr,en}).

import path from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { build, preview } from "vite";
import { ADMIN, VIEWER, seedDemo } from "./seed.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT_ROOT = path.join(ROOT, "docs", "screenshots");
const BUILD_DIR = "dist-demo";
const PORT = 4175;
const BASE_URL = `http://localhost:${PORT}/Timska-kasa/`;

// 540×960 CSS пиксела × deviceScaleFactor 2 = 1080×1920 пиксела (портрет, мобилни распоред).
const VIEWPORT = { width: 540, height: 960 };

const LANGUAGES = {
  sr: {
    locale: "sr-RS",
    form: {
      counterparty: "TechMarket Novi Sad",
      description: "Монитор за нову колегиницу",
    },
  },
  en: {
    locale: "en-GB",
    form: {
      counterparty: "TechMarket Novi Sad",
      description: "Monitor for a new teammate",
    },
  },
};

const NAV = { dashboard: 0, records: 1, funds: 2, categories: 3 };

async function buildApp() {
  Object.assign(process.env, {
    VITE_USE_EMULATORS: "true",
    VITE_FIREBASE_API_KEY: "demo-api-key",
    VITE_FIREBASE_AUTH_DOMAIN: "demo-timska-kasa.firebaseapp.com",
    VITE_FIREBASE_PROJECT_ID: "demo-timska-kasa",
    VITE_FIREBASE_STORAGE_BUCKET: "demo-timska-kasa.appspot.com",
    VITE_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
    VITE_FIREBASE_APP_ID: "1:000000000000:web:demo",
    VITE_FIREBASE_MEASUREMENT_ID: "",
  });
  const common = { root: ROOT, configFile: path.join(ROOT, "vite.config.ts"), logLevel: "warn" };
  await build({ ...common, build: { outDir: BUILD_DIR, emptyOutDir: true } });
  return preview({
    ...common,
    build: { outDir: BUILD_DIR },
    preview: { port: PORT, strictPort: true, host: "localhost" },
  });
}

async function openApp(browser, lang) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: LANGUAGES[lang].locale,
    colorScheme: "light",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`[${lang}] page error:`, error.message));
  await page.goto(BASE_URL);
  await page.waitForFunction(() => "__e2eSignIn" in window);
  return { context, page };
}

async function signIn(page, account) {
  await page.evaluate(
    ([email, password]) => window.__e2eSignIn(email, password),
    [account.email, account.password],
  );
  await page.locator(".bottom-nav").waitFor();
}

async function goTo(page, view, readySelector) {
  await page.locator(".bottom-nav-item").nth(NAV[view]).click();
  await page.locator(readySelector).first().waitFor();
}

async function shoot(page, outDir, name) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), animations: "disabled" });
  console.log(`  ✓ ${name}.png`);
}

function dayInput(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Помера страницу тако да картица „Трансакције“ буде одмах испод горње траке (56 px). */
async function scrollToTransactions(page) {
  await page.locator(".card:has(.card-title-row)").evaluate((card) => {
    window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 56 - 12);
  });
}

async function captureAdmin(browser, lang, outDir) {
  const { context, page } = await openApp(browser, lang);
  const text = LANGUAGES[lang].form;

  await page.locator(".login-screen").waitFor();
  await shoot(page, outDir, "01-login");

  await signIn(page, ADMIN);
  await page.locator(".wallet-card").first().waitFor();
  await shoot(page, outDir, "02-dashboard");

  // Листа трансакција текућег месеца (картице салда остају изнад)
  await scrollToTransactions(page);
  await shoot(page, outDir, "03-dashboard-transactions");

  // Филтери: само расходи, период „година“
  await page.locator(".filter-summary").click();
  await page.locator(".filter-body select").nth(0).selectOption("Расход");
  await page.locator(".period-tab").nth(2).click();
  await scrollToTransactions(page);
  await shoot(page, outDir, "04-dashboard-filters");

  await goTo(page, "records", ".record-item");
  await shoot(page, outDir, "05-records");

  // Форма за нови запис: расход са терећењем фонда (не шаље се)
  await page.locator(".form-toggle").click();
  await page.locator(".type-btn").nth(1).click();
  const form = page.locator(".record-form");
  await form.locator('input[inputmode="decimal"]').fill("37500");
  await form.locator("select").nth(0).selectOption("c-hardware");
  const inputs = form.locator("input:not([type=file])");
  await inputs.nth(3).fill(text.counterparty);
  await form.locator("select").nth(1).selectOption("f1-hardware");
  await inputs.nth(4).fill(text.description);
  await shoot(page, outDir, "06-record-form");
  await page.locator(".form-toggle").click();

  await goTo(page, "funds", ".fund-card");
  await shoot(page, outDir, "07-funds");

  // Алокација новца у први фонд
  await page.locator(".fund-transfer-btns button").first().click();
  await page.locator(".fund-transfer-form input").fill("50000");
  await shoot(page, outDir, "08-fund-allocate");
  await page.locator(".fund-transfer-form .form-actions .ghost").click();

  await goTo(page, "categories", ".cat-chip");
  await shoot(page, outDir, "09-categories");

  // Извештај: прошли месец, преузимање PDF-а
  await goTo(page, "dashboard", ".wallet-card");
  await page.locator(".card-title-row button").click();
  const dialog = page.locator(".report-dialog");
  await dialog.waitFor();
  await dialog.locator(".period-tab").nth(3).click();
  const now = new Date();
  await dialog
    .locator("input[type=date]")
    .nth(0)
    .fill(dayInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  await dialog
    .locator("input[type=date]")
    .nth(1)
    .fill(dayInput(new Date(now.getFullYear(), now.getMonth(), 0)));
  await shoot(page, outDir, "10-report-dialog");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.locator(".primary").click(),
  ]);
  await download.saveAs(path.join(outDir, "report.pdf"));
  console.log("  ✓ report.pdf");

  await context.close();
}

async function captureViewer(browser, lang, outDir) {
  const { context, page } = await openApp(browser, lang);
  await signIn(page, VIEWER);
  await goTo(page, "records", ".record-item");
  await shoot(page, outDir, "11-viewer-records");
  await context.close();
}

async function main() {
  const server = await buildApp();
  const browser = await chromium.launch();
  try {
    for (const lang of Object.keys(LANGUAGES)) {
      const outDir = path.join(OUT_ROOT, lang);
      await mkdir(outDir, { recursive: true });
      const summary = await seedDemo(lang);
      console.log(`\n[${lang}] ${summary.records} records, ${summary.funds} funds`);
      console.log(JSON.stringify(summary.balance));
      await captureAdmin(browser, lang, outDir);
      await captureViewer(browser, lang, outDir);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

await main();
