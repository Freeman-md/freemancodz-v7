import { expect, test } from "@playwright/test";

for (const colorScheme of ["dark", "light"] as const) {
  test(`first visit defaults to dark with ${colorScheme} device preference`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Switch to light theme" }),
    ).toBeEnabled();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
}

test("theme toggles and survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(() => localStorage.getItem("freemancodz-v7-theme")),
  ).toBe("light");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Switch to dark theme" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("unavailable storage still allows switching throughout the visit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("rapid repeated theme choices settle on the latest selection and persist it", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Switch to .* theme/ });
  await expect(toggle).toBeEnabled();
  await toggle.click({ clickCount: 3, delay: 25 });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(247, 248, 250)",
  );
  await expect(toggle.locator("svg.lucide-moon")).toHaveCSS("opacity", "1");
  await expect(toggle.locator("svg.lucide-sun")).toHaveCSS("opacity", "0");
  await toggle.click({ clickCount: 2, delay: 25 });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Switch to dark theme" }),
  ).toBeEnabled();
});
