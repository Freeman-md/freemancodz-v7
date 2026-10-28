import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`saved ${theme} appearance is correct before hydration`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    await page.addInitScript(
      (savedTheme) => localStorage.setItem("freemancodz-v7-theme", savedTheme),
      theme,
    );

    await page.route("http://localhost:3100/", async (route) => {
      const response = await route.fetch();
      const html = await response.text();
      await route.fulfill({
        response,
        body: html.replace(
          /<script([^>]*\bsrc="[^"]+"[^>]*)>/g,
          '<script type="text/plain" data-delayed-hydration$1>',
        ),
      });
    });
    await page.goto("/", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { name: "Freemancodz V7" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const toggle = page.getByRole("button", { name: "Switch to light theme" });
    await expect(toggle).toBeDisabled();
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      theme === "light" ? "rgb(247, 248, 250)" : "rgb(2, 12, 27)",
    );
    const logoBackgrounds = await page
      .getByRole("link", { name: "Freemancodz home" })
      .filter({ visible: true })
      .locator("span")
      .evaluateAll((elements) =>
        elements
          .filter((element) => getComputedStyle(element).display !== "none")
          .map((element) => getComputedStyle(element).backgroundImage),
      );
    expect(logoBackgrounds).toHaveLength(1);
    expect(logoBackgrounds[0]).toContain(`logo-${theme}.svg`);
    await expect(
      toggle.locator(theme === "light" ? "svg.lucide-moon" : "svg.lucide-sun"),
    ).toBeVisible();
    await testInfo.attach(`before-hydration-${theme}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    await page.evaluate(() => {
      for (const original of document.querySelectorAll<HTMLScriptElement>(
        "script[data-delayed-hydration]",
      )) {
        const script = document.createElement("script");
        for (const attribute of Array.from(original.attributes)) {
          if (
            attribute.name !== "type" &&
            attribute.name !== "data-delayed-hydration"
          ) {
            script.setAttribute(attribute.name, attribute.value);
          }
        }
        original.replaceWith(script);
      }
    });
    await expect(
      page.getByRole("button", {
        name:
          theme === "light" ? "Switch to dark theme" : "Switch to light theme",
      }),
    ).toBeEnabled();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(errors).toEqual([]);
  });
}
