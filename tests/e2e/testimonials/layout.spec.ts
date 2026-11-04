import { expect, test } from "@playwright/test";

test.use({ video: "on" });

for (const viewport of [
  { width: 1440, height: 960 },
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 320, height: 844 },
  { width: 360, height: 844 },
]) {
  for (const theme of viewport.width === 1440 || viewport.width === 390
    ? ["dark", "light"]
    : ["dark"]) {
    test(`${viewport.width}px ${theme} natural short/long quotation, centred controls and clear attribution`, async ({
      page,
      browserName,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(
        (value) => localStorage.setItem("freemancodz-v7-theme", value),
        theme,
      );
      await page.goto("/");
      const section = page.getByRole("region", {
        name: "/ THEIR WORDS",
        exact: true,
      });
      const next = section.getByRole("button", { name: "Next testimonial" });
      await next.scrollIntoViewIfNeeded();
      await expect(next).toBeEnabled();
      const desktop = viewport.width >= 1024;
      const bounds = (await section.boundingBox())!;
      expect(bounds.x).toBe(desktop ? 80 : 24);
      const heading = section.getByRole("heading", { level: 2 });
      const headingBounds = (await heading.boundingBox())!;
      const watermark = (await section
        .locator('[data-section-part="watermark"]')
        .boundingBox())!;
      expect(headingBounds.x + headingBounds.width / 2).toBeCloseTo(
        viewport.width / 2,
        0,
      );
      expect(watermark.x + watermark.width / 2).toBeCloseTo(
        viewport.width / 2,
        0,
      );
      expect(watermark.x).toBeGreaterThanOrEqual(0);
      expect(watermark.x + watermark.width).toBeLessThanOrEqual(viewport.width);
      const headingArea = (await heading.locator("..").boundingBox())!;
      expect(headingArea.height).toBe(desktop ? 140 : 100);
      expect(headingBounds.y - headingArea.y).toBe(desktop ? 70 : 48);
      const previous = section.getByRole("button", {
        name: "Previous testimonial",
      });
      const previousBounds = (await previous.boundingBox())!;
      const nextBounds = (await next.boundingBox())!;
      expect(previousBounds.height).toBe(48);
      expect(nextBounds.height).toBe(48);
      expect(previousBounds.y).toBe(nextBounds.y);
      expect(
        (previousBounds.x + nextBounds.x + nextBounds.width) / 2,
      ).toBeCloseTo(viewport.width / 2, 0);
      expect(previousBounds.y - headingArea.y - headingArea.height).toBe(
        desktop ? 32 : 20,
      );
      const heights: number[] = [];
      for (const index of [0, 1]) {
        if (index === 1) {
          await next.click();
        }
        const figure = section.getByRole("figure");
        const quote = figure.getByRole("blockquote");
        await expect(quote).toHaveCSS("font-size", desktop ? "31px" : "19px");
        await expect(quote).toHaveCSS(
          "line-height",
          desktop ? "46.5px" : "30.4px",
        );
        await expect(quote.locator("p")).toHaveCount(index === 0 ? 1 : 3);
        await next.focus();
        await page.keyboard.press(
          browserName === "webkit" && process.platform === "darwin"
            ? "Alt+Tab"
            : "Tab",
        );
        await expect(figure.getByRole("link")).toBeFocused();
        const stageBounds = (await section
          .locator("[data-testimonial-stage]")
          .boundingBox())!;
        const figureBounds = (await figure.boundingBox())!;
        heights.push(figureBounds.height);
        expect(stageBounds.height).toBeCloseTo(figureBounds.height, 0);
        expect(stageBounds.width).toBe(Math.min(bounds.width, 980));
        const currentControl = (await next.boundingBox())!;
        expect(stageBounds.y - currentControl.y - currentControl.height).toBe(
          desktop ? 40 : 32,
        );
        await expect(figure.getByRole("link")).toHaveCSS(
          "outline-style",
          "solid",
        );
        const linkBounds = (await figure.getByRole("link").boundingBox())!;
        expect(linkBounds.x - 6).toBeGreaterThanOrEqual(stageBounds.x);
        expect(linkBounds.x + linkBounds.width + 6).toBeLessThanOrEqual(
          stageBounds.x + stageBounds.width,
        );
        expect(linkBounds.y + linkBounds.height + 6).toBeLessThan(
          stageBounds.y + stageBounds.height,
        );
        const avatar = figure.locator("figcaption > span");
        await expect(avatar).toHaveCSS("width", "48px");
        await expect(avatar).toHaveCSS("height", "48px");
        const captionBounds = (await figure
          .locator("figcaption")
          .boundingBox())!;
        const quoteBounds = (await quote.boundingBox())!;
        expect(
          captionBounds.y - quoteBounds.y - quoteBounds.height,
        ).toBeCloseTo(30, 0);
        const contact = (await page
          .locator('section[aria-labelledby="contact"]')
          .boundingBox())!;
        expect(contact.y).toBeGreaterThan(stageBounds.y + stageBounds.height);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(viewport.width);
        await testInfo.attach(
          `testimonials-${viewport.width}-${theme}-${index === 0 ? "emmanuel" : "matin"}-reduced`,
          {
            body: await section.screenshot({
              style:
                "header, button[aria-label='AI assistant — coming soon']{opacity:0!important} section[aria-labelledby='testimonials']{width:100%!important;max-width:none!important;padding-inline:var(--page-gutter)!important}",
            }),
            contentType: "image/png",
          },
        );
      }
      expect(heights[1]).toBeGreaterThan(heights[0] * 1.5);
    });
  }
}

test("short/long resize is interruptible, masked and naturally remeasured", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  const next = section.getByRole("button", { name: "Next testimonial" });
  await next.focus();
  const stage = section.locator("[data-testimonial-stage]");
  const initial = (await stage.boundingBox())!.height;
  await next.click();
  const movement = await stage.evaluate((element) => {
    const animation = element
      .getAnimations()
      .find(
        (animation) =>
          animation instanceof CSSTransition &&
          animation.transitionProperty === "height",
      )!;
    animation.pause();
    animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
    return Number(animation.effect!.getTiming().duration);
  });
  expect(movement).toBe(420);
  const middle = (await stage.boundingBox())!.height;
  const target = (await section.getByRole("figure").boundingBox())!.height;
  expect(middle).toBeGreaterThan(initial);
  expect(middle).toBeLessThan(target);
  await expect(stage).toHaveCSS("overflow", "hidden");
  await testInfo.attach("testimonials-switch-intermediate-mask", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await stage.evaluate((element) =>
    element.getAnimations().forEach((animation) => animation.finish()),
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await expect
    .poll(
      async () =>
        (await stage.boundingBox())!.height -
        (await section.getByRole("figure").boundingBox())!.height,
    )
    .toBeCloseTo(0, 0);
  await next.evaluate((button: HTMLButtonElement) => {
    for (let index = 0; index < 4; index++) {
      button.click();
    }
  });
  await expect(section.getByRole("status")).toHaveText(
    "Matin Adebayo, testimonial 2 of 2",
  );
  await expect
    .poll(
      async () =>
        (await stage.boundingBox())!.height -
        (await section.getByRole("figure").boundingBox())!.height,
    )
    .toBeCloseTo(0, 0);
});

test("selected quotation font reflow resizes its stage without a viewport change", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  await section.getByRole("button", { name: "Next testimonial" }).click();
  await expect(section.getByRole("status")).toHaveText(
    "Matin Adebayo, testimonial 2 of 2",
  );

  const figure = section.getByRole("figure");
  const stage = section.locator("[data-testimonial-stage]");
  const initialHeight = (await figure.boundingBox())!.height;

  await figure.getByRole("blockquote").evaluate((element) => {
    element.style.fontFamily = "monospace";
  });

  await expect
    .poll(async () =>
      Math.abs((await figure.boundingBox())!.height - initialHeight),
    )
    .toBeGreaterThan(1);
  await expect
    .poll(
      async () =>
        (await stage.boundingBox())!.height -
        (await figure.boundingBox())!.height,
    )
    .toBeCloseTo(0, 0);

  const stageBounds = (await stage.boundingBox())!;
  const attributionBounds = (await figure.locator("figcaption").boundingBox())!;
  const attributionBottom = attributionBounds.y + attributionBounds.height;
  const stageBottom = stageBounds.y + stageBounds.height;
  // Computed CSS heights and bounding boxes can round to different subpixels.
  expect(attributionBottom - stageBottom).toBeLessThanOrEqual(0.5);
});
