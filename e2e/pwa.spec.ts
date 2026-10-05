import { expect, test } from "@playwright/test";

test.describe("PWA", () => {
  test("излаже валидан web manifest", async ({ page, request }) => {
    await page.goto("./");

    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();

    const response = await request.get(new URL(href!, page.url()).toString());
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  test("региструје service worker", async ({ page }) => {
    await page.goto("./");

    const registered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return Boolean(registration.active);
    });
    expect(registered).toBe(true);
  });
});
