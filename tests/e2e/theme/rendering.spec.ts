import { expect, test } from "@playwright/test";

test.use({ video: "on" });

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
      page.getByRole("heading", {
        name: "From first click. To a job well done.",
      }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const toggle = page.getByRole("button", { name: "Switch to light theme" });
    await expect(toggle).toBeDisabled();
    expect(
      await page
        .locator("body")
        .evaluate(
          (element) =>
            element
              .getAnimations({ subtree: true })
              .filter((animation) => animation instanceof CSSTransition).length,
        ),
    ).toBe(0);
    await expect(
      toggle.locator(theme === "light" ? "svg.lucide-moon" : "svg.lucide-sun"),
    ).toHaveCSS("opacity", "1");
    await expect(
      toggle.locator(theme === "light" ? "svg.lucide-sun" : "svg.lucide-moon"),
    ).toHaveCSS("opacity", "0");
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
          .filter((element) => getComputedStyle(element).opacity !== "0")
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
    expect(
      await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation instanceof CSSTransition).length,
      ),
    ).toBe(0);
    expect(errors).toEqual([]);
  });
}

test("hydrated colours and icons transition in place, while reduced motion switches immediately", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Switch to .* theme/ });
  await expect(toggle).toBeEnabled();
  const bounds = await toggle.boundingBox();
  await toggle.click();
  const transitions = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation instanceof CSSTransition)
      .map((animation) => ({
        property: (animation as CSSTransition).transitionProperty,
        duration: animation.effect!.getTiming().duration,
      })),
  );
  expect(
    transitions.some(
      (animation) =>
        animation.property === "background-color" && animation.duration === 200,
    ),
  ).toBe(true);
  expect(
    transitions.filter(
      (animation) =>
        animation.property === "opacity" && animation.duration === 180,
    ),
  ).toHaveLength(4);
  expect(await toggle.boundingBox()).toEqual(bounds);
  await testInfo.attach("theme-changing", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(247, 248, 250)",
  );
  await expect(toggle.locator("svg.lucide-moon")).toHaveCSS("opacity", "1");
  await expect(toggle.locator("svg.lucide-sun")).toHaveCSS("opacity", "0");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await toggle.click();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(2, 12, 27)",
  );
  await expect(toggle.locator("svg.lucide-sun")).toHaveCSS("opacity", "1");
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation instanceof CSSTransition).length,
    ),
  ).toBe(0);
  expect(await toggle.boundingBox()).toEqual(bounds);
});
