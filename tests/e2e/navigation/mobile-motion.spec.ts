import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, video: "on" });

test("opening interruption and repeated close requests settle without stale completion", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Close navigation" })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(dialog.getByRole("navigation")).not.toHaveAttribute("inert");
  await expect(
    dialog.getByRole("link", { name: "Work", exact: true }),
  ).toBeVisible();
});

test("reduced motion settles immediately, including changes during opening and closing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("navigation")).not.toHaveAttribute("inert");
  expect(
    await dialog.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dialog.getByRole("navigation")).not.toHaveAttribute("inert");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dialog).toHaveCount(0);
});

test("theme switches during opening, while open and during closing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(dialog).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(dialog.getByRole("navigation")).not.toHaveAttribute("inert");
  await dialog.getByRole("button", { name: "Switch to dark theme" }).click();
  await dialog.getByRole("button", { name: "Close navigation" }).click();
  await dialog.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(dialog).toBeHidden();
});

for (const theme of ["dark", "light"]) {
  test(`CSS motion in ${theme} uses measured origin, covering radius, ordered stagger and stationary header`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(
      (preference) => localStorage.setItem("freemancodz-v7-theme", preference),
      theme,
    );
    await page.goto("/");
    const triggerBounds = (await page
      .getByRole("button", { name: "Open navigation" })
      .boundingBox())!;
    await page.getByRole("button", { name: "Open navigation" }).click();
    const dialog = page.getByRole("dialog");
    const motion = await dialog.evaluate((element) =>
      element.getAnimations({ subtree: true }).map((animation) => ({
        timing: animation.effect!.getTiming(),
        frames: (animation.effect as KeyframeEffect).getKeyframes(),
      })),
    );
    const reveal = motion.find(
      (animation) => animation.timing.duration === 480,
    )!;
    expect(reveal).toBeTruthy();
    expect(
      motion.some(
        (animation) =>
          animation.timing.duration === 240 &&
          animation.frames[animation.frames.length - 1].transform ===
            "rotate(45deg)",
      ),
    ).toBe(true);
    expect(reveal.frames[0].easing).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    const centerX = triggerBounds.x + triggerBounds.width / 2;
    const centerY = triggerBounds.y + triggerBounds.height / 2;
    expect(reveal.frames[0].clipPath).toBe(
      `circle(0px at ${centerX}px ${centerY}px)`,
    );
    expect(
      motion
        .filter((animation) => animation.timing.duration === 380)
        .map((animation) => Math.round(animation.timing.delay ?? 0))
        .sort(),
    ).toEqual([180, 255, 330]);
    await testInfo.attach("circular-reveal-opening", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await expect(dialog.getByRole("navigation")).not.toHaveAttribute("inert");
    expect(
      await dialog
        .getByRole("button", { name: "Close navigation" })
        .boundingBox(),
    ).toEqual(triggerBounds);

    await page.setViewportSize({ width: 500, height: 750 });
    const geometry = await dialog.evaluate((element) => {
      const surface = Array.from(element.querySelectorAll("div")).find(
        (candidate) =>
          getComputedStyle(candidate).clipPath.startsWith("circle("),
      )!;
      return getComputedStyle(surface).clipPath;
    });
    const closeBounds = (await dialog
      .getByRole("button", { name: "Close navigation" })
      .boundingBox())!;
    const x = closeBounds.x + closeBounds.width / 2;
    const y = closeBounds.y + closeBounds.height / 2;
    const radius = Math.ceil(
      Math.hypot(Math.max(x, 500 - x), Math.max(y, 750 - y)),
    );
    expect(geometry).toBe(`circle(${radius}px at ${x}px ${y}px)`);
    await page.keyboard.press("Escape");
    const closing = await dialog.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.effect!.getTiming()),
    );
    expect(
      closing.some((timing) => timing.duration === 320 && timing.delay === 240),
    ).toBe(true);
    expect(
      closing
        .filter((timing) => timing.duration === 170)
        .map((timing) => timing.delay ?? 0)
        .sort((a, b) => a - b),
    ).toEqual([0, 35, 70]);
    await expect(dialog).toBeHidden();
  });
}

test("desktop breakpoint releases modal and restores visible focus during either transition", async ({
  page,
}) => {
  await page.goto("/");
  for (const duringClose of [false, true]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open navigation" }).click();
    if (duringClose) {
      await page.keyboard.press("Escape");
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const logo = page
      .getByRole("link", { name: "Freemancodz home" })
      .filter({ visible: true });
    await expect(logo).toBeFocused();
    await expect(page.locator("body")).toHaveCSS("pointer-events", "auto");
    await page.mouse.wheel(0, 250);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
  }
});
