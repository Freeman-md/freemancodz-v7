import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });

async function releaseHydration(page: Page) {
  await page.evaluate(() => {
    for (const original of document.querySelectorAll<HTMLScriptElement>(
      "script[data-testimonial-delayed]",
    )) {
      const script = document.createElement("script");
      for (const attribute of Array.from(original.attributes)) {
        if (
          attribute.name !== "type" &&
          attribute.name !== "data-testimonial-delayed"
        ) {
          script.setAttribute(attribute.name, attribute.value);
        }
      }
      original.replaceWith(script);
    }
  });
}

test("four ordered entrance layers reserve geometry independently of word colour and never replay", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  const heading = section.getByRole("heading", { level: 2 });
  await section
    .locator("[data-section-heading]")
    .evaluate((element) =>
      scrollTo(0, scrollY + element.getBoundingClientRect().top - 140),
    );
  const headingBounds = await heading.boundingBox();
  const stageBounds = await section
    .locator("[data-testimonial-stage]")
    .boundingBox();
  await expect
    .poll(() =>
      section
        .locator('[data-testimonial-entrance="quote"]')
        .evaluate((element) => element.getAnimations().length),
    )
    .toBe(1);
  const timings = await section.evaluate((element) => {
    const targets = [
      ...element.querySelectorAll(
        "[data-section-part], [data-testimonial-entrance]",
      ),
    ];
    const animations = targets.map((target) => target.getAnimations()[0]);
    Reflect.set(window, "testimonialEntrances", animations);
    return animations.map((animation) => {
      const effect = animation.effect as KeyframeEffect;
      const timing = effect.getTiming();
      const transform = effect.getKeyframes()[0].transform;
      return {
        start: Number(animation.startTime) + (timing.delay ?? 0),
        duration: Number(timing.duration),
        y: transform ? new DOMMatrixReadOnly(String(transform)).m42 : 0,
      };
    });
  });
  expect(timings.map((timing) => timing.start)).toEqual(
    timings.map((timing) => timing.start).sort((a, b) => a - b),
  );
  expect(timings.map((timing) => timing.duration)).toEqual([
    300, 400, 250, 300,
  ]);
  expect(timings.map((timing) => timing.y)).toEqual([0, -16, 0, 0]);
  expect(timings[1].start).toBeGreaterThan(timings[0].start);
  expect(timings[2].start).toBeLessThan(timings[1].start + timings[1].duration);
  expect(timings[3].start).toBeGreaterThan(timings[2].start);
  const colorsBefore = await section
    .locator('figure[data-active="true"] [data-word-index]')
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).color),
    );
  for (const element of await section
    .locator("[data-section-part], [data-testimonial-entrance]")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  expect(await heading.boundingBox()).toEqual(headingBounds);
  expect(
    await section.locator("[data-testimonial-stage]").boundingBox(),
  ).toEqual(stageBounds);
  expect(
    await section
      .locator('figure[data-active="true"] [data-word-index]')
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).color),
      ),
  ).toEqual(colorsBefore);
  await testInfo.attach("testimonials-entrance-settled", {
    body: await section.screenshot({ style: "header {opacity:0!important}" }),
    contentType: "image/png",
  });
  await section.getByRole("button", { name: "Next testimonial" }).click();
  await page
    .getByRole("button", { name: "Switch to light theme" })
    .filter({ visible: true })
    .click();
  await page.evaluate(() => scrollTo(0, 0));
  await section
    .getByRole("button", { name: "Previous testimonial" })
    .scrollIntoViewIfNeeded();
  expect(
    await section.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation)
        .every((animation) =>
          (Reflect.get(window, "testimonialEntrances") as Animation[]).includes(
            animation,
          ),
        ),
    ),
  ).toBe(true);
});

for (const restored of [false, true]) {
  test(`${restored ? "restored before hydration" : "fast jump"} past heading recovers controls and quote without revisiting trigger`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    if (restored) {
      await page.route("http://localhost:3100/", async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          body: (await response.text()).replace(
            /<script([^>]*\bsrc="[^"]+"[^>]*)>/g,
            '<script type="text/plain" data-testimonial-delayed$1>',
          ),
        });
      });
    }
    await page.goto("/");
    const section = page.getByRole("region", {
      name: "/ THEIR WORDS",
      exact: true,
    });
    if (!restored) {
      await expect(
        section.getByRole("button", { name: "Next testimonial" }),
      ).toBeEnabled();
    }
    const group = section.locator("[data-section-heading]");
    await group.evaluate((element) =>
      scrollTo(0, scrollY + element.getBoundingClientRect().bottom + 5),
    );
    if (restored) {
      await releaseHydration(page);
    }
    await expect(
      section.getByRole("button", { name: "Next testimonial" }),
    ).toBeEnabled();
    for (const element of await section
      .locator("[data-section-part], [data-testimonial-entrance]")
      .all()) {
      await expect(element).toHaveCSS("opacity", "1");
    }
    expect(
      await group.evaluate((element) => element.getBoundingClientRect().bottom),
    ).toBeLessThan(0);
  });
}

test("pending control focus reveals all required context without changing selection", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  await expect(
    section.locator('[data-testimonial-entrance="quote"]'),
  ).toHaveCSS("opacity", "0");
  const headingBounds = await section
    .getByRole("heading", { level: 2 })
    .boundingBox();
  await section
    .getByRole("button", { name: "Next testimonial" })
    .evaluate((element) => element.focus({ preventScroll: true }));
  for (const element of await section
    .locator("[data-section-part], [data-testimonial-entrance]")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  expect(
    await section.getByRole("heading", { level: 2 }).boundingBox(),
  ).toEqual(headingBounds);
  await expect(section.getByRole("status")).toHaveText(
    "Emmanuel Nelson, testimonial 1 of 2",
  );
});

test("already focused heading initializes readable context and preserves focus geometry", async ({
  page,
}) => {
  await page.route("http://localhost:3100/", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /<script([^>]*\bsrc="[^"]+"[^>]*)>/g,
        '<script type="text/plain" data-testimonial-delayed$1>',
      ),
    });
  });
  await page.goto("/#testimonials");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  const heading = page.locator("#testimonials");
  await expect(heading).toBeFocused();
  await releaseHydration(page);
  await expect(
    section.getByRole("button", { name: "Next testimonial" }),
  ).toBeEnabled();
  await expect(heading).toBeFocused();
  await expect
    .poll(() =>
      heading.evaluate((element) =>
        Math.round(element.getBoundingClientRect().top),
      ),
    )
    .toBe(104);
  for (const element of await section
    .locator("[data-section-part], [data-testimonial-entrance]")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
});

test("initial/live reduced motion settles all layers and selected height without replay", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  await section
    .locator("[data-section-heading]")
    .evaluate((element) =>
      scrollTo(0, scrollY + element.getBoundingClientRect().top - 140),
    );
  await expect
    .poll(() =>
      section.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation instanceof CSSAnimation).length,
      ),
    )
    .toBe(4);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const element of await section
    .locator("[data-section-part], [data-testimonial-entrance]")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  await section.getByRole("button", { name: "Next testimonial" }).click();
  expect(
    (await section.locator("[data-testimonial-stage]").boundingBox())!.height,
  ).toBeCloseTo((await section.getByRole("figure").boundingBox())!.height, 0);
  expect(
    await section.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => scrollTo(0, 0));
  await section
    .getByRole("button", { name: "Next testimonial" })
    .scrollIntoViewIfNeeded();
  expect(
    await section.evaluate(
      (element) =>
        element
          .getAnimations({ subtree: true })
          .filter((animation) => animation instanceof CSSAnimation).length,
    ),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  for (const element of await section
    .locator("[data-section-part], [data-testimonial-entrance]")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
});

test("missing IntersectionObserver leaves heading, controls and quote readable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "IntersectionObserver");
  });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  for (const element of await section
    .locator("[data-section-part], [data-testimonial-entrance]")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  await expect(
    section.getByRole("button", { name: "Next testimonial" }),
  ).toBeEnabled();
});
