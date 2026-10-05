import { expect, test } from "@playwright/test";

test.describe("неауторизован корисник", () => {
  test("види екран за пријаву", async ({ page }) => {
    await page.goto("./");

    await expect(page.getByRole("heading", { name: "Тимска каса" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Пријави се преко Google налога" }),
    ).toBeVisible();
  });

  test("не приказује навигацију апликације", async ({ page }) => {
    await page.goto("./");

    await expect(page.getByRole("heading", { name: "Тимска каса" })).toBeVisible();
    await expect(page.locator(".bottom-nav")).toHaveCount(0);
  });
});
