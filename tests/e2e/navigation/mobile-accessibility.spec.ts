import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, video: "on" });

test("keyboard opening, hidden links, focus containment, Escape and restoration", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Navigation" });
  const close = dialog.getByRole("button", { name: "Close navigation" });
  await expect(close).toBeFocused();
  await expect(
    dialog.getByRole("navigation", { includeHidden: true }),
  ).toHaveAttribute("inert", "");
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("link", { name: "Freemancodz home" }),
  ).toBeFocused();
  await expect(dialog.getByRole("navigation")).not.toHaveAttribute("inert");

  for (let index = 0; index < 10; index++) {
    await page.keyboard.press(index % 2 ? "Shift+Tab" : "Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("pointer dismissal locks background interaction and scrolling through exit", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.scrollTo(0, 250);
    document
      .querySelector("main")!
      .addEventListener("click", () =>
        document.body.setAttribute("data-background-clicked", "true"),
      );
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("navigation")).not.toHaveAttribute("inert");
  await page.mouse.click(10, 750);
  await page.mouse.wheel(0, 400);
  expect(await page.evaluate(() => window.scrollY)).toBe(250);
  await expect(page.locator("body")).not.toHaveAttribute(
    "data-background-clicked",
  );
  await dialog.getByRole("button", { name: "Close navigation" }).click();
  await expect(dialog).toBeVisible();
  expect(
    await page
      .locator("body")
      .evaluate((element) => getComputedStyle(element).pointerEvents),
  ).toBe("none");
  await page.mouse.wheel(0, 400);
  expect(await page.evaluate(() => window.scrollY)).toBe(250);
  await expect(dialog).toBeHidden();
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(250);
});

test("each destination follows only after modal exit and receives focus", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const samples: { position: number; restricted: boolean }[] = [];
    Reflect.set(window, "mobileAnchorSamples", samples);
    window.addEventListener("scroll", () =>
      samples.push({
        position: scrollY,
        restricted:
          !!document.querySelector('[role="dialog"]') ||
          getComputedStyle(document.body).pointerEvents === "none",
      }),
    );
  });
  for (const [label, id] of [
    ["Work", "work"],
    ["Freeman", "experience"],
    ["Let’s talk", "contact"],
    ["Freemancodz home", "top"],
  ]) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("navigation")).not.toHaveAttribute("inert");
    const previousUrl = page.url();
    const previousPosition = await page.evaluate(() => scrollY);
    await dialog.getByRole("link", { name: label, exact: true }).click();
    await expect(dialog).toBeVisible();
    expect(page.url()).toBe(previousUrl);
    expect(await page.evaluate(() => scrollY)).toBe(previousPosition);
    await expect(dialog).toBeHidden();
    await expect(page.locator(`#${id}`)).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect
      .poll(() =>
        page
          .locator(`#${id}`)
          .evaluate((element) =>
            Math.round(element.getBoundingClientRect().top),
          ),
      )
      .toBe(id === "top" ? 0 : 104);
  }
  const samples = await page.evaluate(
    () =>
      Reflect.get(window, "mobileAnchorSamples") as {
        position: number;
        restricted: boolean;
      }[],
  );
  expect(samples.length).toBeGreaterThan(4);
  expect(samples.every((sample) => !sample.restricted)).toBe(true);
});

test("reduced-motion mobile destination is immediate after modal restrictions release", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Work", exact: true })
    .click();
  await expect(page.locator("#work")).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page
      .locator("#work")
      .evaluate((element) => Math.round(element.getBoundingClientRect().top)),
  ).toBe(104);
  await expect(page.locator("body")).toHaveCSS("pointer-events", "auto");
});
