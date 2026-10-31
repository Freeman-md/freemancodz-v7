import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });
for (const route of ["/", "/work"]) {
  test(`${route} filters keep order, count, pressed state and keyboard focus`, async ({
    page,
  }) => {
    await page.goto(route);
    const work = page.getByRole("region", { name: "/ SELECTED WORK" });
    const headings = work.locator(
      "a[target='_blank'] h2, a[target='_blank'] h3",
    );
    const initial = await headings.allTextContents();
    for (const [filter, count] of [
      ["Real projects", route === "/" ? 4 : 5],
      ["Explorations", route === "/" ? 1 : 3],
      ["All", route === "/" ? 5 : 8],
    ] as const) {
      const button = work.getByRole("button", { name: filter, exact: true });
      await button.focus();
      await page.keyboard.press("Enter");
      await expect(button).toBeFocused();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(work.getByRole("button", { pressed: true })).toHaveCount(1);
      await expect(work.getByRole("status")).toContainText(
        `${count} ${count === 1 ? "project" : "projects"}`,
      );
      await expect(work.locator("a[target='_blank']")).toHaveCount(count);
      const visible = await headings.allTextContents();
      expect(visible).toEqual(initial.filter((text) => visible.includes(text)));
      const removed = initial.filter((text) => !visible.includes(text));
      for (const text of removed) {
        await expect(work.getByRole("link", { name: text })).toHaveCount(0);
      }
    }
    await work
      .getByRole("button", { name: "Explorations", exact: true })
      .click();
    await expect(work.locator("a[target='_blank']").first()).toContainText(
      "Interface Studies",
    );
    await work
      .getByRole("group", { name: "Filter projects" })
      .evaluate((group) => {
        const buttons = group.querySelectorAll("button");
        for (const index of [0, 1, 2, 0, 2, 1]) {
          buttons[index].click();
        }
      });
    await expect(
      work.getByRole("button", { name: "Real projects", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(work.locator("a[target='_blank']")).toHaveCount(
      route === "/" ? 4 : 5,
    );
  });
}

test("320px touch and keyboard can reach every filter without wrapping controls or page overflow", async ({
  browser,
  browserName,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  const group = page.getByRole("group", { name: "Filter projects" });
  await group.scrollIntoViewIfNeeded();
  const action = page.getByRole("link", { name: "View all work" });
  await expect(group.locator("..")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  const actionBounds = (await action.boundingBox())!;
  for (const label of ["Explorations", "Real projects", "All"]) {
    const button = group.getByRole("button", { name: label, exact: true });
    await button.evaluate((element) =>
      element.scrollIntoView({ block: "nearest", inline: "nearest" }),
    );
    await button.tap();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(
      Math.abs((await button.boundingBox())!.y - actionBounds.y),
    ).toBeLessThan(6);
  }
  await group.getByRole("button", { name: "All", exact: true }).focus();
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab",
  );
  await expect(
    group.getByRole("button", { name: "Real projects", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  // Programmatic focus also scrolls the lane; no filter is removed from keyboard order.
  await group
    .getByRole("button", { name: "Explorations", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(page.locator("a[target='_blank']")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await context.close();
});
