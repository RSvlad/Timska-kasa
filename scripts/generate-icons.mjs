// Генерише PNG иконице за PWA из public/icon.svg (користи Playwright Chromium).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const svg = readFileSync(new URL("../public/icon.svg", import.meta.url), "utf8");
const sizes = { "pwa-192.png": 192, "pwa-512.png": 512, "apple-touch-icon.png": 180 };

const browser = await chromium.launch();
for (const [file, size] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: fileURLToPath(new URL(`../public/${file}`, import.meta.url)) });
  await page.close();
}
await browser.close();
