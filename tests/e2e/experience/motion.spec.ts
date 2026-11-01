import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });

test("four-stage entrance reserves geometry, fades summary in place and never replays", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ EXPERIENCE",
    exact: true,
  });
  const heading = section.getByRole("heading", { level: 2 });
  const summary = section.getByText("3+ years of experience", { exact: true });
  await section
    .locator("[data-section-heading]")
    .evaluate((element) =>
      scrollTo(0, scrollY + element.getBoundingClientRect().top - 140),
    );
  const headingBounds = await heading.boundingBox();
  const summaryBounds = await summary.boundingBox();
  const listBounds = await section.getByRole("list").boundingBox();
  await expect
    .poll(() =>
      section
        .getByRole("listitem")
        .first()
        .evaluate((element) => element.getAnimations().length),
    )
    .toBe(1);
  const stages = await section.evaluate((element) => {
    const targets = [
      ...element.querySelectorAll(
        "[data-section-part], [data-experience-summary], [data-experience-row]",
      ),
    ];
    const animations = targets.map((target) => target.getAnimations()[0]);
    Reflect.set(window, "experienceEntrances", animations);
    return animations.map((animation) => {
      const effect = animation.effect as KeyframeEffect;
      const timing = effect.getTiming();
      const transform = effect.getKeyframes()[0].transform;
      return {
        start: Number(animation.startTime) + (timing.delay ?? 0),
        duration: Number(timing.duration),
        fromY: transform ? new DOMMatrixReadOnly(String(transform)).m42 : 0,
      };
    });
  });
  expect(stages.map((stage) => stage.start)).toEqual(
    stages.map((stage) => stage.start).sort((a, b) => a - b),
  );
  expect(stages.map((stage) => stage.duration)).toEqual([
    300, 400, 250, 450, 450, 450,
  ]);
  expect(stages.map((stage) => stage.fromY)).toEqual([0, -16, 0, 16, 16, 16]);
  expect(stages[1].start).toBeGreaterThan(stages[0].start);
  expect(stages[2].start).toBeGreaterThanOrEqual(
    stages[1].start + stages[1].duration - 1,
  );
  expect(stages[3].start).toBeGreaterThanOrEqual(
    stages[2].start + stages[2].duration - 60,
  );
  expect(stages[4].start).toBeGreaterThan(stages[3].start);
  expect(stages[5].start).toBeGreaterThan(stages[4].start);
  expect(stages[5].start).toBeLessThan(stages[3].start + stages[3].duration);
  for (const element of await section
    .locator("[data-section-part], [data-experience-summary], li")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  expect(await heading.boundingBox()).toEqual(headingBounds);
  expect(await summary.boundingBox()).toEqual(summaryBounds);
  expect(await section.getByRole("list").boundingBox()).toEqual(listBounds);
  await testInfo.attach("experience-entrance-settled", {
    body: await section.screenshot({
      style: "header { opacity:0!important; }",
    }),
    contentType: "image/png",
  });
  await page
    .getByRole("button", { name: "Switch to light theme" })
    .filter({ visible: true })
    .click();
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.evaluate(() => scrollTo(0, 0));
  await section.scrollIntoViewIfNeeded();
  expect(
    await section.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation)
        .every((animation) =>
          (Reflect.get(window, "experienceEntrances") as Animation[]).includes(
            animation,
          ),
        ),
    ),
  ).toBe(true);
});

test("later rows reveal without repeating the elapsed introduction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 330 });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ EXPERIENCE",
    exact: true,
  });
  await section
    .locator("[data-section-heading]")
    .evaluate((element) =>
      scrollTo(0, scrollY + element.getBoundingClientRect().top - 80),
    );
  const rows = section.getByRole("listitem");
  await expect(rows.first()).toHaveCSS("opacity", "1");
  await expect(rows.last()).toHaveCSS("opacity", "0");
  const originalHeadingAnimation = await section
    .locator('[data-section-part="heading"]')
    .evaluate((element) => {
      Reflect.set(
        window,
        "experienceHeadingAnimation",
        element.getAnimations()[0],
      );
      return element.getAnimations().length;
    });
  expect(originalHeadingAnimation).toBe(1);
  await rows
    .last()
    .evaluate((element) =>
      scrollTo(0, scrollY + element.getBoundingClientRect().top - 150),
    );
  await expect(rows.last()).toHaveCSS("opacity", "1");
  const laterDelay = await rows
    .last()
    .evaluate(
      (element) => element.getAnimations()[0].effect!.getTiming().delay,
    );
  expect(laterDelay).toBeLessThan(200);
  expect(
    await section
      .locator('[data-section-part="heading"]')
      .evaluate((element) =>
        element
          .getAnimations()
          .every(
            (animation) =>
              animation === Reflect.get(window, "experienceHeadingAnimation"),
          ),
      ),
  ).toBe(true);
});

for (const restored of [false, true]) {
  test(`${restored ? "restored position before hydration" : "fast jump"} past the trigger recovers skipped introduction and visible rows`, async ({
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
            '<script type="text/plain" data-experience-delayed$1>',
          ),
        });
      });
    }
    await page.goto("/");
    const section = page.getByRole("region", {
      name: "/ EXPERIENCE",
      exact: true,
    });
    const group = section.locator("[data-section-heading]");
    if (!restored) {
      await expect(section).toHaveAttribute("data-experience-reveal", "");
    }
    await group.evaluate((element) =>
      scrollTo(0, scrollY + element.getBoundingClientRect().bottom + 5),
    );
    if (restored) {
      await page.evaluate(() => {
        for (const original of document.querySelectorAll<HTMLScriptElement>(
          "script[data-experience-delayed]",
        )) {
          const script = document.createElement("script");
          for (const attribute of Array.from(original.attributes)) {
            if (
              attribute.name !== "type" &&
              attribute.name !== "data-experience-delayed"
            ) {
              script.setAttribute(attribute.name, attribute.value);
            }
          }
          original.replaceWith(script);
        }
      });
    }
    await expect(section).toHaveAttribute("data-experience-reveal", "");
    for (const element of await section
      .locator("[data-section-part], [data-experience-summary], li")
      .all()) {
      await expect(element).toHaveCSS("opacity", "1");
    }
    expect(
      await group.evaluate((element) => element.getBoundingClientRect().bottom),
    ).toBeLessThan(0);
  });
}

for (const delayed of [false, true]) {
  test(`direct anchor arrival${delayed ? " focused before hydration" : ""} preserves immediate context, focus and header clearance`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    if (delayed) {
      await page.route("http://localhost:3100/", async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          body: (await response.text()).replace(
            /<script([^>]*\bsrc="[^"]+"[^>]*)>/g,
            '<script type="text/plain" data-experience-delayed$1>',
          ),
        });
      });
    }
    await page.goto("/#experience");
    const section = page.getByRole("region", {
      name: "/ EXPERIENCE",
      exact: true,
    });
    const heading = page.locator("#experience");
    await expect(heading).toBeFocused();
    if (delayed) {
      await page.evaluate(() => {
        for (const original of document.querySelectorAll<HTMLScriptElement>(
          "script[data-experience-delayed]",
        )) {
          const script = document.createElement("script");
          for (const attribute of Array.from(original.attributes)) {
            if (
              attribute.name !== "type" &&
              attribute.name !== "data-experience-delayed"
            ) {
              script.setAttribute(attribute.name, attribute.value);
            }
          }
          original.replaceWith(script);
        }
      });
    }
    await expect(section).toHaveAttribute("data-experience-reveal", "");
    await expect(heading).toBeFocused();
    await expect
      .poll(() =>
        heading.evaluate((element) =>
          Math.round(element.getBoundingClientRect().top),
        ),
      )
      .toBe(104);
    for (const element of await section
      .locator("[data-section-part], [data-experience-summary]")
      .all()) {
      await expect(element).toHaveCSS("opacity", "1");
      await expect(element).toHaveAttribute(
        "data-experience-state",
        "complete",
      );
    }
  });
}

test("focusing the pending h2 immediately reveals its introduction at unchanged geometry", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ EXPERIENCE",
    exact: true,
  });
  const heading = page.locator("#experience");
  await expect(section.locator("[data-experience-summary]")).toHaveCSS(
    "opacity",
    "0",
  );
  const bounds = await heading.boundingBox();
  await heading.evaluate((element) => element.focus({ preventScroll: true }));
  await expect(heading).toBeFocused();
  expect(await heading.boundingBox()).toEqual(bounds);
  for (const element of await section
    .locator("[data-section-part], [data-experience-summary]")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
});

test("live and initial reduced motion settle every stage without replay when disabled again", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ EXPERIENCE",
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
        (element) => element.getAnimations({ subtree: true }).length,
      ),
    )
    .toBe(6);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const element of await section
    .locator("[data-section-part], [data-experience-summary], li")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  await expect
    .poll(() =>
      section.evaluate(
        (element) => element.getAnimations({ subtree: true }).length,
      ),
    )
    .toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => scrollTo(0, 0));
  await section.scrollIntoViewIfNeeded();
  expect(
    await section.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  for (const element of await section
    .locator("[data-section-part], [data-experience-summary], li")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  expect(
    await section.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
});

test("absent IntersectionObserver leaves the full section readable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "IntersectionObserver");
  });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ EXPERIENCE",
    exact: true,
  });
  for (const element of await section
    .locator("[data-section-part], [data-experience-summary], li")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
});
