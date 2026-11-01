import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });

test("ordered overlapping Services entrance keeps the actual heading stationary and does not replay", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "/ SERVICES", exact: true });
  const heading = section.getByRole("heading", {
    name: "/ SERVICES",
    exact: true,
  });
  await section
    .locator("[data-section-heading]")
    .evaluate((element) =>
      scrollTo(0, scrollY + element.getBoundingClientRect().top - 150),
    );
  const bounds = await heading.boundingBox();
  await expect
    .poll(() =>
      section
        .locator("[data-service-row]")
        .first()
        .evaluate((element) => element.getAnimations().length),
    )
    .toBe(1);
  const timings = await section.evaluate((element) => {
    const targets = [
      ...element.querySelectorAll("[data-section-part]"),
      ...element.querySelectorAll("[data-service-row]"),
    ];
    const animations = targets.map((target) => target.getAnimations()[0]);
    Reflect.set(window, "serviceEntrances", animations);
    return animations.map((animation) => ({
      delay: animation.effect!.getTiming().delay ?? 0,
      duration: Number(animation.effect!.getTiming().duration),
    }));
  });
  expect(timings.map((timing) => timing.delay)).toEqual(
    timings.map((timing) => timing.delay).sort((a, b) => a - b),
  );
  expect(timings[1].delay).toBeGreaterThan(timings[0].delay);
  expect(timings[2].delay).toBeGreaterThan(timings[1].delay);
  expect(timings[3].delay).toBeGreaterThan(timings[2].delay);
  expect(timings[3].delay).toBeLessThan(timings[2].delay + timings[2].duration);
  const directions = await section.evaluate((element) => {
    const heading = element.querySelector('[data-section-part="heading"]')!;
    const row = element.querySelector("[data-service-row]")!;
    return [heading, row].map(
      (target) =>
        new DOMMatrixReadOnly(
          String(
            (
              target.getAnimations()[0].effect as KeyframeEffect
            ).getKeyframes()[0].transform,
          ),
        ).m42,
    );
  });
  expect(directions).toEqual([-16, 16]);
  for (const element of await section
    .locator("[data-section-part], [data-service-row]")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  expect(await heading.boundingBox()).toEqual(bounds);
  const automation = section.getByRole("button", {
    name: "AUTOMATION",
    exact: true,
  });
  await automation.focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Switch to light theme" })
    .filter({ visible: true })
    .click();
  await page.evaluate(() => scrollTo(0, 0));
  await section.scrollIntoViewIfNeeded();
  expect(
    await section.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .filter((animation) => animation instanceof CSSAnimation)
        .every((animation) =>
          (Reflect.get(window, "serviceEntrances") as Animation[]).includes(
            animation,
          ),
        ),
    ),
  ).toBe(true);
  await testInfo.attach("services-entrance-and-switch-settled", {
    body: await section.screenshot({
      style: "header { opacity:0!important; }",
    }),
    contentType: "image/png",
  });
});

test("CSS grid switching has an intermediate layout and rapid toggles settle on the latest accessible panel", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "/ SERVICES", exact: true });
  const web = section.getByRole("button", {
    name: "WEB DEVELOPMENT",
    exact: true,
  });
  const automation = section.getByRole("button", {
    name: "AUTOMATION",
    exact: true,
  });
  await web.scrollIntoViewIfNeeded();
  await expect(web.locator("../../..")).toHaveCSS("opacity", "1");
  const initialHeight = (await web.locator("../..").boundingBox())!.height;
  await automation.focus();
  await page.keyboard.press("Enter");
  const movements = await section.evaluate((element) => {
    const transitions = element
      .getAnimations({ subtree: true })
      .filter(
        (animation) =>
          animation instanceof CSSTransition &&
          animation.transitionProperty === "grid-template-rows",
      );
    for (const transition of transitions) {
      transition.pause();
      transition.currentTime =
        Number(transition.effect!.getTiming().duration) / 2;
    }
    return transitions.map(
      (animation) => animation.effect!.getTiming().duration,
    );
  });
  expect(movements).toEqual([300, 300]);
  const intermediateHeight = (await web.locator("../..").boundingBox())!.height;
  expect(intermediateHeight).toBeLessThan(initialHeight);
  expect(intermediateHeight).toBeGreaterThan(
    (await web.boundingBox())!.height + 64,
  );
  await expect(
    section.getByRole("region", { name: "WEB DEVELOPMENT", exact: true }),
  ).toHaveCount(0);
  await testInfo.attach("services-switch-intermediate", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await section.evaluate((element) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      if (animation instanceof CSSTransition) {
        animation.finish();
      }
    }
  });
  await section.evaluate((element) => {
    const headers = element.querySelectorAll<HTMLButtonElement>("h3 button");
    for (const index of [0, 1, 0, 1, 0]) {
      headers[index].click();
    }
  });
  await expect(web).toHaveAttribute("aria-expanded", "true");
  await expect(automation).toHaveAttribute("aria-expanded", "false");
  await expect
    .poll(() =>
      section.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter(
              (animation) =>
                animation instanceof CSSTransition &&
                animation.playState === "running",
            ).length,
      ),
    )
    .toBe(0);
  await expect(section.getByRole("region")).toHaveCount(1);
});

for (const delayedHydration of [false, true]) {
  test(`${delayedHydration ? "restored before hydration" : "fast jump"} past Services heading reveals controls without returning`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    if (delayedHydration) {
      await page.route("http://localhost:3100/", async (route) => {
        const response = await route.fetch();
        const html = await response.text();
        await route.fulfill({
          response,
          body: html.replace(
            /<script([^>]*\bsrc="[^"]+"[^>]*)>/g,
            '<script type="text/plain" data-service-delayed$1>',
          ),
        });
      });
    }
    await page.goto("/");
    const section = page.getByRole("region", {
      name: "/ SERVICES",
      exact: true,
    });
    const group = section.locator("[data-section-heading]");
    if (!delayedHydration) {
      await expect(
        section.getByRole("button", { name: "WEB DEVELOPMENT", exact: true }),
      ).toBeEnabled();
    }
    await group.evaluate((element) =>
      scrollTo(0, scrollY + element.getBoundingClientRect().bottom + 5),
    );
    if (delayedHydration) {
      await page.evaluate(() => {
        for (const original of document.querySelectorAll<HTMLScriptElement>(
          "script[data-service-delayed]",
        )) {
          const script = document.createElement("script");
          for (const attribute of Array.from(original.attributes)) {
            if (
              attribute.name !== "type" &&
              attribute.name !== "data-service-delayed"
            ) {
              script.setAttribute(attribute.name, attribute.value);
            }
          }
          original.replaceWith(script);
        }
      });
    }
    await expect(
      section.getByRole("button", { name: "WEB DEVELOPMENT", exact: true }),
    ).toBeEnabled();
    for (const element of await section
      .locator("[data-section-part], [data-service-row]")
      .all()) {
      await expect(element).toHaveCSS("opacity", "1");
    }
    expect(
      await group.evaluate((element) => element.getBoundingClientRect().bottom),
    ).toBeLessThan(0);
  });
}

test("keyboard focus reveals pending context without selecting, and reduced motion settles initially and during changes", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "/ SERVICES", exact: true });
  await expect(section.locator("[data-service-row]").first()).toHaveCSS(
    "opacity",
    "0",
  );
  await page.locator('[data-project-id="interface-studies"] a').focus();
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab",
  );
  const web = section.getByRole("button", {
    name: "WEB DEVELOPMENT",
    exact: true,
  });
  await expect(web).toBeFocused();
  await expect(section.locator("[data-service-row]").first()).toHaveCSS(
    "opacity",
    "1",
  );
  for (const element of await section.locator("[data-section-part]").all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  await expect(web).toHaveAttribute("aria-expanded", "true");
  const automation = section.getByRole("button", {
    name: "AUTOMATION",
    exact: true,
  });
  await automation.focus();
  await page.keyboard.press("Enter");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      section.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
      ),
    )
    .toBe(0);
  await expect(automation).toHaveAttribute("aria-expanded", "true");
  await page.reload();
  for (const element of await section
    .locator("[data-section-part], [data-service-row]")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  await expect(web).toHaveAttribute("aria-expanded", "true");
  await expect(
    section.getByRole("button", { name: "AUTOMATION", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(
    await section.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "IntersectionObserver");
  });
  await page.reload();
  for (const element of await section
    .locator("[data-section-part], [data-service-row]")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
});
