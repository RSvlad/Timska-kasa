import { expect, test } from "@playwright/test";

test.describe("језик — српски прегледач", () => {
  test.use({ locale: "sr-RS" });

  test("отвара се на српском", async ({ page }) => {
    await page.goto("./");

    await expect(page.getByRole("heading", { name: "Тимска каса" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "sr-Cyrl");
  });

  test("дугме мења језик на енглески и избор опстаје после освежавања", async ({ page }) => {
    await page.goto("./");

    await page.getByRole("button", { name: "Промени језик: English" }).click();

    await expect(page.getByRole("heading", { name: "Team Fund" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.reload();

    await expect(page.getByRole("heading", { name: "Team Fund" })).toBeVisible();
  });
});

test.describe("језик — енглески прегледач", () => {
  test.use({ locale: "en-US" });

  test("отвара се на енглеском", async ({ page }) => {
    await page.goto("./");

    await expect(page.getByRole("heading", { name: "Team Fund" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Change language: Српски" })).toBeVisible();
  });
});
