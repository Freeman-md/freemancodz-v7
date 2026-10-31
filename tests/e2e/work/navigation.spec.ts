import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });

test("view all work opens eight-project route with metadata, skip target and no self-link", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "View all work" }).click();
  await expect(page).toHaveURL(/\/work$/);
  await expect(page).toHaveTitle("Selected Work | Freemancodz");
  await expect(page.locator("a[target='_blank']")).toHaveCount(8);
  await expect(page.getByRole("link", { name: "View all work" })).toHaveCount(
    0,
  );
  await page.reload();
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab",
  );
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

for (const mobile of [false, true]) {
  test(`${mobile ? "mobile" : "desktop"} collection navigation genuinely loads home destinations and preserves theme`, async ({
    page,
  }) => {
    if (mobile) {
      await page.setViewportSize({ width: 390, height: 844 });
    }
    for (const [label, id] of [
      ["Work", "work"],
      ["Freeman", "experience"],
      ["Let’s talk", "contact"],
      ["Freemancodz home", "top"],
    ]) {
      await page.goto("/work");
      await page.evaluate(() =>
        addEventListener("beforeunload", () =>
          sessionStorage.setItem(
            "exitRestrictions",
            JSON.stringify({
              dialog: !!document.querySelector('[role="dialog"]'),
              pointer: getComputedStyle(document.body).pointerEvents,
            }),
          ),
        ),
      );
      const toggle = page
        .getByRole("button", { name: /Switch to .* theme/ })
        .filter({ visible: true });
      if (
        (await toggle.getAttribute("aria-label")) === "Switch to light theme"
      ) {
        await toggle.click();
      }
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      if (mobile) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page
          .getByRole("dialog")
          .getByRole("link", { name: label, exact: true })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
      } else {
        await page
          .getByRole("link", { name: label, exact: true })
          .filter({ visible: true })
          .click();
      }
      await expect(page).toHaveURL(new RegExp(`/#${id}$`));
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "From first click. To a job well done.",
        }),
      ).toHaveCount(1);
      await expect(page.locator(`#${id}`)).toBeFocused();
      await expect
        .poll(() =>
          page
            .locator(`#${id}`)
            .evaluate((element) =>
              Math.round(element.getBoundingClientRect().top),
            ),
        )
        .toBe(id === "top" ? 0 : 104);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      if (mobile) {
        expect(
          await page.evaluate(() =>
            JSON.parse(sessionStorage.getItem("exitRestrictions")!),
          ),
        ).toEqual({ dialog: false, pointer: "auto" });
      }
    }
  });
}

test("cross-document and modified header clicks retain native behaviour", async ({
  page,
}) => {
  await page.goto("/work");
  const work = page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Work", exact: true });
  const prevented = await work.evaluate((element) => {
    const results: boolean[] = [];
    for (const modifiers of [
      {},
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { altKey: true },
    ]) {
      window.addEventListener(
        "click",
        (event) => {
          results.push(event.defaultPrevented);
          event.preventDefault();
        },
        { once: true },
      );
      element.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          ...modifiers,
        }),
      );
    }
    return results;
  });
  expect(prevented).toEqual([false, false, false, false, false]);
  await expect(page).toHaveURL(/\/work$/);
});
