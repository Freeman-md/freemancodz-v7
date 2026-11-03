import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });

async function delayHydration(page: Page) {
  await page.route("http://localhost:3100/", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /<script([^>]*\bsrc="[^"]+"[^>]*)>/g,
        '<script type="text/plain" data-contact-delayed$1>',
      ),
    });
  });
}

async function releaseHydration(page: Page) {
  await page.evaluate(() => {
    for (const original of document.querySelectorAll<HTMLScriptElement>(
      "script[data-contact-delayed]",
    )) {
      const script = document.createElement("script");
      for (const attribute of Array.from(original.attributes)) {
        if (
          attribute.name !== "type" &&
          attribute.name !== "data-contact-delayed"
        ) {
          script.setAttribute(attribute.name, attribute.value);
        }
      }
      original.replaceWith(script);
    }
  });
}

test("overlapping entrance reserves space, keeps the heading stationary and plays once", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const section = page.getByRole("region", {
    name: "HAVE A PROJECT IN MIND?",
    exact: true,
  });
  await expect(section).toHaveAttribute("data-contact-state", "pending");
  await section.evaluate((element) =>
    scrollTo({
      top: element.getBoundingClientRect().top + scrollY - innerHeight + 120,
      behavior: "instant",
    }),
  );
  await expect(section).toHaveAttribute("data-contact-state", "active");
  const headingBounds = await section.getByRole("heading").boundingBox();
  const sectionBounds = await section.boundingBox();
  const timings = await section
    .locator("[data-contact-part]")
    .evaluateAll((elements) => {
      const animations = elements.map((element) =>
        element
          .getAnimations()
          .find((animation) => animation instanceof CSSAnimation)!,
      );
      Reflect.set(window, "contactEntrances", animations);
      return animations.map((animation) => {
        const effect = animation.effect as KeyframeEffect;
        const timing = effect.getTiming();
        const transform = effect.getKeyframes()[0].transform;
        return {
          duration: timing.duration,
          delay: timing.delay ?? 0,
          y: transform ? new DOMMatrixReadOnly(String(transform)).m42 : 0,
        };
      });
    });
  expect(timings.map((value) => value.duration)).toEqual([
    250, 400, 350, 300, 350, 350, 350, 350,
  ]);
  expect(timings.map((value) => value.delay)).toEqual([
    0, 150, 300, 450, 650, 700, 750, 800,
  ]);
  expect(timings.map((value) => value.y)).toEqual([0, 16, 0, 6, 0, 0, 0, 0]);
  expect(timings[1].delay).toBeLessThan(Number(timings[0].duration));
  expect(timings[2].delay).toBeLessThan(
    timings[1].delay + Number(timings[1].duration),
  );
  for (const part of await section.locator("[data-contact-part]").all()) {
    await expect(part).toHaveCSS("opacity", "1");
  }
  expect(await section.getByRole("heading").boundingBox()).toEqual(
    headingBounds,
  );
  expect(await section.boundingBox()).toEqual(sectionBounds);
  expect(
    await section
      .locator('[data-contact-part="availability"] > span')
      .evaluate((element) => element.getAnimations().length),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Switch to light theme" })
    .filter({ visible: true })
    .click();
  await page.evaluate(() => scrollTo(0, 0));
  await section.scrollIntoViewIfNeeded();
  expect(
    await section.evaluate((element) => {
      const original = Reflect.get(window, "contactEntrances") as Animation[];
      return Array.from(element.querySelectorAll("[data-contact-part]")).every(
        (part, index) => part.getAnimations().includes(original[index]),
      );
    }),
  ).toBe(true);
  await testInfo.attach("contact-entrance-settled", {
    body: await section.screenshot({ style: "header {opacity:0!important}" }),
    contentType: "image/png",
  });
});

for (const scenario of [
  "fast jump",
  "restored before hydration",
  "direct contact fragment",
]) {
  test(`${scenario} reveals complete usable Contact content`, async ({
    page,
  }) => {
    if (scenario !== "fast jump") {
      await delayHydration(page);
    }
    await page.goto(scenario === "direct contact fragment" ? "/#contact" : "/");
    await page.evaluate(() => document.fonts.ready);
    const section = page.getByRole("region", {
      name: "HAVE A PROJECT IN MIND?",
      exact: true,
    });
    if (scenario !== "direct contact fragment") {
      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
    }
    if (scenario !== "fast jump") {
      await releaseHydration(page);
    }
    await expect(section).toHaveAttribute(
      "data-contact-state",
      /active|complete/,
    );
    for (const part of await section.locator("[data-contact-part]").all()) {
      await expect(part).toHaveCSS("opacity", "1");
    }
    if (scenario === "direct contact fragment") {
      await expect(section.getByRole("heading")).toBeFocused();
      expect(
        (await section.getByRole("heading").boundingBox())!.y,
      ).toBeGreaterThanOrEqual(104);
    }
  });
}

test("pending link focus immediately reveals required context and queued observation cannot replay it", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "HAVE A PROJECT IN MIND?",
    exact: true,
  });
  await expect(section).toHaveAttribute("data-contact-state", "pending");
  const link = section.getByRole("link", { name: "Freemancodz on Contra" });
  await link.evaluate((element) => element.focus({ preventScroll: true }));
  await expect(link).toBeFocused();
  await expect(section).toHaveAttribute("data-contact-state", "complete");
  await section.scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(section).toHaveAttribute("data-contact-state", "complete");
  for (const part of await section.locator("[data-contact-part]").all()) {
    await expect(part).toHaveCSS("opacity", "1");
  }
});

test("initial and live reduced motion settle immediately and disabling reduction never replays", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "HAVE A PROJECT IN MIND?",
    exact: true,
  });
  await expect(section).toHaveAttribute("data-contact-state", "complete");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await section.scrollIntoViewIfNeeded();
  expect(
    await section.evaluate(
      (element) =>
        element
          .getAnimations({ subtree: true })
          .filter((animation) => animation instanceof CSSAnimation).length,
    ),
  ).toBe(0);
  await page.reload();
  await page.evaluate(() => scrollTo(0, 0));
  await page.reload();
  await expect(section).toHaveAttribute("data-contact-state", "pending");
  await section.evaluate((element) =>
    scrollTo({
      top: element.getBoundingClientRect().top + scrollY - innerHeight + 120,
      behavior: "instant",
    }),
  );
  await expect(section).toHaveAttribute("data-contact-state", "active");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(section).toHaveAttribute("data-contact-state", "complete");
  for (const part of await section.locator("[data-contact-part]").all()) {
    await expect(part).toHaveCSS("opacity", "1");
    await expect(part).toHaveCSS("transform", "none");
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(
    await section.evaluate(
      (element) =>
        element
          .getAnimations({ subtree: true })
          .filter((animation) => animation instanceof CSSAnimation).length,
    ),
  ).toBe(0);
});

test("without IntersectionObserver all content stays readable and native links remain available", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(window, "IntersectionObserver"),
  );
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "HAVE A PROJECT IN MIND?",
    exact: true,
  });
  await section.scrollIntoViewIfNeeded();
  await expect(section).not.toHaveAttribute("data-contact-state");
  for (const part of await section.locator("[data-contact-part]").all()) {
    await expect(part).toHaveCSS("opacity", "1");
  }
  await expect(section.getByRole("link")).toHaveCount(5);
});
