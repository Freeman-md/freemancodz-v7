import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });

test("links and logo navigate and focus unobscured destinations", async ({
  page,
}) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  for (const [label, id] of [
    ["Work", "work"],
    ["Freeman", "experience"],
    ["Let’s talk", "contact"],
  ]) {
    const link = navigation.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", `/#${id}`);
    await link.click();
    const target = page.locator(`#${id}`);
    await expect(target).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    if (id === "contact") {
      await expect
        .poll(() =>
          target.evaluate((element) => {
            const top = element.getBoundingClientRect().top + scrollY;
            const clearance = parseFloat(
              getComputedStyle(document.documentElement).scrollPaddingTop,
            );
            const destination = Math.min(
              Math.max(0, top - clearance),
              document.documentElement.scrollHeight - innerHeight,
            );
            return Math.round(scrollY - destination);
          }),
        )
        .toBe(0);
      expect((await target.boundingBox())!.y).toBeGreaterThanOrEqual(104);
    } else {
      await expect
        .poll(() =>
          target.evaluate((element) =>
            Math.round(element.getBoundingClientRect().top),
          ),
        )
        .toBe(104);
    }
  }

  await page
    .getByRole("link", { name: "Freemancodz home" })
    .filter({ visible: true })
    .click();
  await expect(page.locator("#top")).toBeFocused();
  await expect(page).toHaveURL(/#top$/);
  await expect
    .poll(() =>
      page
        .locator("#top")
        .evaluate((element) => Math.round(element.getBoundingClientRect().top)),
    )
    .toBe(0);
});

test("keyboard skip link reaches main content with visible focus", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  // macOS WebKit uses Option+Tab to enter full keyboard navigation.
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab",
  );
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  expect((await skip.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  await expect(skip).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("anchor journey moves through intermediate positions and reduced motion moves immediately", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Switch to light theme" }),
  ).toBeEnabled();
  await page.evaluate(() => {
    const positions: number[] = [];
    Reflect.set(window, "anchorPositions", positions);
    window.addEventListener("scroll", () => positions.push(window.scrollY));
  });
  await page.getByRole("link", { name: "Work", exact: true }).click();
  await expect(page.locator("#work")).toBeFocused();
  await expect
    .poll(() =>
      page
        .locator("#work")
        .evaluate((element) => Math.round(element.getBoundingClientRect().top)),
    )
    .toBe(104);
  const { positions, destinationPosition } = await page.evaluate(() => ({
    positions: Reflect.get(window, "anchorPositions") as number[],
    destinationPosition: scrollY,
  }));
  expect(
    positions.some(
      (position) => position > 0 && position < destinationPosition,
    ),
  ).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const result = await page
    .getByRole("link", { name: "Let’s talk" })
    .evaluate((link) => {
      (link as HTMLAnchorElement).click();
      const destination = document.getElementById("contact")!;
      return {
        top: Math.round(destination.getBoundingClientRect().top),
        expectedTop: Math.round(
          destination.getBoundingClientRect().top +
            scrollY -
            Math.min(
              Math.max(
                0,
                destination.getBoundingClientRect().top +
                  scrollY -
                  parseFloat(
                    getComputedStyle(document.documentElement).scrollPaddingTop,
                  ),
              ),
              document.documentElement.scrollHeight - innerHeight,
            ),
        ),
        focused: document.activeElement === destination,
        hash: location.hash,
      };
    });
  expect(result.top).toBe(result.expectedTop);
  expect(result.top).toBeGreaterThanOrEqual(104);
  expect(result.focused).toBe(true);
  expect(result.hash).toBe("#contact");
});
