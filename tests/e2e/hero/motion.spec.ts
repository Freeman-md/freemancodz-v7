import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });

test("six entrances reserve layout and reveal portrait before labels", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const image = page.getByRole("img", { name: /Freeman in profile/ });
  const hero = page.locator("#top");
  const bounds = await hero.boundingBox();
  const samples = await hero.evaluate((element) => {
    const heading = element.querySelector("h1")!;
    const stages = [
      heading.children[0],
      heading.children[1],
      element.querySelector("p")!,
      element.querySelector("a")!.parentElement!,
      element.querySelector("img")!.parentElement!.parentElement!,
      element.lastElementChild!,
    ];
    const animations = stages.map((stage) => stage.getAnimations()[0]);
    const timings = animations.map((animation) =>
      animation.effect!.getTiming(),
    );
    for (const animation of element.getAnimations({ subtree: true })) {
      animation.pause();
    }
    function sample(time: number) {
      for (const animation of element.getAnimations({ subtree: true })) {
        animation.currentTime = time;
      }
      return stages.map((stage) => ({
        opacity: Number(getComputedStyle(stage).opacity),
        transform: getComputedStyle(stage).transform,
      }));
    }
    return {
      delays: timings.map((timing) => timing.delay ?? 0),
      first: sample(0),
      middle: sample(1250),
      portrait: sample(1850),
      complete: sample(2200),
    };
  });
  expect(samples.delays).toEqual([...samples.delays].sort((a, b) => a - b));
  expect(samples.first.map((stage) => stage.opacity)).toEqual([
    0, 0, 0, 0, 0, 0,
  ]);
  expect(samples.middle.slice(0, 3).map((stage) => stage.opacity)).toEqual([
    1, 1, 1,
  ]);
  expect(samples.middle[3].opacity).toBeGreaterThan(0);
  expect(samples.middle[4].opacity).toBe(0);
  expect(samples.middle[5].opacity).toBe(0);
  expect(samples.portrait[4].opacity).toBe(1);
  expect(samples.portrait[5].opacity).toBe(0);
  expect(samples.complete.map((stage) => stage.opacity)).toEqual([
    1, 1, 1, 1, 1, 1,
  ]);
  expect(samples.first[1].transform).toBe("matrix(1, 0, 0, 1, 0, -24)");
  expect(samples.first[3].transform).toBe("matrix(1, 0, 0, 1, 0, 12)");
  expect(samples.complete[1].transform).toBe("matrix(1, 0, 0, 1, 0, 0)");
  expect(await hero.boundingBox()).toEqual(bounds);
  await expect(image.locator("..")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  await testInfo.attach("entrance-complete", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

for (const viewport of [
  { width: 1440, height: 960, distance: 600, scale: 1.15 },
  { width: 390, height: 844, distance: 300, scale: 1.08 },
]) {
  test(`${viewport.width}px portrait continuously follows scroll and reverses without moving the other content`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const image = page.getByRole("img", { name: /Freeman in profile/ });
    const scrollLayer = image.locator("..");
    await expect(image.locator("../..")).toHaveCSS("opacity", "1");
    const heading = page.getByRole("heading", { level: 1 });
    const start = (await heading.boundingBox())!.y;
    const heroHeight = (await page.locator("#top").boundingBox())!.height;
    for (const progress of [0.25, 0.5, 1, 1.25, 0.5, 0]) {
      await page.evaluate(
        (value) => scrollTo(0, value),
        viewport.distance * progress,
      );
      const clamped = Math.min(1, progress);
      await expect
        .poll(() =>
          scrollLayer.evaluate((element) =>
            Number(getComputedStyle(element).opacity),
          ),
        )
        .toBeCloseTo(0.55 + 0.45 * clamped, 3);
      await expect
        .poll(() =>
          scrollLayer.evaluate(
            (element) =>
              new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
          ),
        )
        .toBeCloseTo(1 + (viewport.scale - 1) * clamped, 3);
      expect((await heading.boundingBox())!.y).toBeCloseTo(
        start - viewport.distance * progress,
        0,
      );
      expect((await page.locator("#top").boundingBox())!.height).toBe(
        heroHeight,
      );
      if (progress === 1 || progress === 0) {
        await testInfo.attach(`portrait-progress-${progress}`, {
          body: await page.screenshot(),
          contentType: "image/png",
        });
      }
    }
  });
}

test("early scroll cannot bypass portrait entrance, and theme/logo journeys do not replay it", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const image = page.getByRole("img", { name: /Freeman in profile/ });
  const entrance = image.locator("../..");
  // Hold the actual entrance before its portrait stage while scroll remains live.
  await page.locator("#top").evaluate((element) => {
    const animations = element.getAnimations({ subtree: true });
    Reflect.set(window, "heroAnimations", animations);
    for (const animation of animations) {
      animation.pause();
      animation.currentTime = 1100;
    }
  });
  await page.evaluate(() => scrollTo(0, 300));
  await expect(image.locator("..")).toHaveCSS("opacity", "0.775");
  await expect(entrance).toHaveCSS("opacity", "0");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(entrance).toHaveCSS("opacity", "0");
  await page.locator("#top").evaluate((element) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      animation.currentTime = 2200;
      animation.play();
    }
  });
  await expect(entrance).toHaveCSS("opacity", "1");
  await page
    .getByRole("link", { name: "Freemancodz home" })
    .filter({ visible: true })
    .click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(entrance).toHaveCSS("opacity", "1");
  expect(
    await page.locator("#top").evaluate((element) => {
      const original = Reflect.get(window, "heroAnimations") as Animation[];
      return element
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation)
        .every(
          (animation) =>
            original.includes(animation) &&
            Number(animation.currentTime) >=
              Number(animation.effect!.getComputedTiming().endTime),
        );
    }),
  ).toBe(true);
  await testInfo.attach("theme-and-logo-entrance-stays-complete", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("reduced motion initially and during a visit shows complete static content and stays complete when re-enabled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const image = page.getByRole("img", { name: /Freeman in profile/ });
  const scrollLayer = image.locator("..");
  const hero = page.locator("#top");
  await expect(image.locator("../..")).toHaveCSS("opacity", "1");
  await expect(scrollLayer).toHaveCSS("opacity", "1");
  await expect(scrollLayer).toHaveCSS("transform", "none");
  expect(
    await hero.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await page.evaluate(() => scrollTo(0, 300));
  await expect(scrollLayer).toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(image.locator("../..")).toHaveCSS("opacity", "1");
  await expect
    .poll(() =>
      scrollLayer.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
      ),
    )
    .toBeCloseTo(1.075, 3);
  await page.reload();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scrollLayer).toHaveCSS("opacity", "1");
  await expect(scrollLayer).toHaveCSS("transform", "none");
  await expect(
    page.getByRole("link", { name: "Explore my work" }).locator(".."),
  ).toHaveCSS("opacity", "1");
  expect(
    await hero.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
});

test("unmodified entrance and scroll sequence", async ({ page }, testInfo) => {
  await page.goto("/");
  const image = page.getByRole("img", { name: /Freeman in profile/ });
  await expect(page.getByText("Freeman Madudili").locator("../..")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(image.locator("../..")).toHaveCSS("opacity", "1");
  await page.evaluate(() => scrollTo({ top: 300, behavior: "smooth" }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(300);
  await testInfo.attach("natural-scroll-midpoint", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "smooth" }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});
