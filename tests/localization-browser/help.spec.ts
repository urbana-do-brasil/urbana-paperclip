import { test, expect } from "@playwright/test";

test("public help uses explicit language and bundled docs without private API requests", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: "en-US" });
  const page = await context.newPage();
  const privateRequests: string[] = [];
  page.on("request", (request) => { if (new URL(request.url()).pathname.startsWith("/api/")) privateRequests.push(request.url()); });
  await page.goto("/help/pt-BR/start/quickstart");
  await expect(page.getByRole("heading", { name: "Início rápido", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  expect(await page.locator('main a[href="/help/pt-BR/start/core-concepts"]').count()).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: "English", exact: true })).toHaveAttribute("href", "/help/en/start/quickstart");
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quickstart", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/help\/en\/start\/quickstart$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/help/pt-BR/api/costs");
  await expect(page.getByRole("heading", { name: "Custos", exact: true })).toBeVisible();
  await expect(page.locator('article[lang="pt-BR"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "English", exact: true })).toHaveAttribute("href", "/help/en/api/costs");
  await page.goto("/help/pt-BR/deploy/database#connection-pool-settings");
  await expect(page.getByRole("heading", { name: "Banco de dados", exact: true })).toBeVisible();
  await expect(page.locator('[id="connection-pool-settings"]')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/help/pt-BR/start/quickstart");
  const heading = page.getByRole("heading", { name: "Início rápido", exact: true });
  await expect(heading).toBeVisible();
  const box = await heading.boundingBox();
  expect(box?.y).toBeLessThan(844);
  const navigationToggle = page.locator("summary").filter({ hasText: "Tópicos de ajuda" });
  await expect(navigationToggle).toBeVisible();
  await navigationToggle.click();
  await expect(page.getByRole("navigation", { name: "Tópicos de ajuda" })).toBeVisible();
  expect(privateRequests).toEqual([]);
  await context.close();
});
