import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });

test("initial header/card entrances overlap in order, reserve geometry and complete", async ({
  page,
}, testInfo) => {
  await page.goto("/work");
  const heading = page.getByRole("heading", {
    level: 1,
    name: "/ SELECTED WORK",
  });
  const bounds = await heading.boundingBox();
  await expect
    .poll(() =>
      page
        .locator('[data-work-reveal="card"]')
        .first()
        .evaluate((element) => element.getAnimations().length),
    )
    .toBe(1);
  const timing = await page
    .getByRole("region", { name: "/ SELECTED WORK" })
    .evaluate((section) => {
      const roles = ["watermark", "heading", "controls", "card"];
      return roles.map((role) =>
        Array.from(
          section.querySelectorAll(`[data-work-reveal='${role}']`),
        ).map((element) => {
          const animation = element.getAnimations()[0];
          return animation
            ? {
                delay: animation.effect!.getTiming().delay ?? 0,
                duration: animation.effect!.getTiming().duration,
              }
            : null;
        }),
      );
    });
  const starts = timing.map((group) => group[0]!.delay);
  expect(starts).toEqual([...starts].sort((a, b) => a - b));
  expect(starts[1]).toBeGreaterThan(starts[0]);
  expect(starts[3]).toBeLessThan(starts[2] + Number(timing[2][0]!.duration));
  const cards = timing[3].filter((item) => item !== null);
  expect(cards.length).toBeGreaterThanOrEqual(3);
  expect(cards[1]!.delay).toBeGreaterThan(cards[0]!.delay);
  expect(cards[1]!.delay).toBeLessThan(
    cards[0]!.delay + Number(cards[0]!.duration),
  );
  await expect(heading.locator("span")).toHaveCSS("opacity", "1");
  await expect(page.locator('[data-work-reveal="card"]').first()).toHaveCSS(
    "opacity",
    "1",
  );
  expect(await heading.boundingBox()).toEqual(bounds);
  await testInfo.attach("work-entrance-settled", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("later cards reveal once, filtering/theme/scroll do not replay them, and focus reveals pending content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/work");
  const lastCard = page.locator("[data-project-id]").last();
  const pending = lastCard.locator(":scope > div");
  await expect(pending).toHaveCSS("opacity", "0");
  await lastCard.locator("a").focus();
  await expect(pending).toHaveCSS("opacity", "1");
  const studies = page.locator('[data-project-id="interface-studies"]');
  await studies.scrollIntoViewIfNeeded();
  await expect(studies.locator(":scope > div")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.getByRole("button", { name: "Explorations", exact: true }).click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await studies.scrollIntoViewIfNeeded();
  expect(
    await studies
      .locator(":scope > div")
      .evaluate((element) => element.getAnimations().length),
  ).toBe(0);
  await expect(studies.locator(":scope > div")).toHaveCSS("opacity", "1");
});

test("retained cards reflow and newly included visible results fade on a separate layer", async ({
  page,
}, testInfo) => {
  await page.goto("/work");
  const explorations = page.getByRole("button", {
    name: "Explorations",
    exact: true,
  });
  await expect(explorations).toBeEnabled();
  await expect(page.locator('[data-project-id="jpscents"] > div')).toHaveCSS(
    "opacity",
    "1",
  );
  // Capture real native keyframes as they are created, without changing their playback.
  await page.evaluate(() => {
    const records: {
      id: string;
      frames: PropertyIndexedKeyframes | Keyframe[];
      options: number | KeyframeAnimationOptions | undefined;
    }[] = [];
    Reflect.set(window, "reflows", records);
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.hasAttribute("data-project-id")) {
        records.push({
          id: this.getAttribute("data-project-id")!,
          frames: frames!,
          options,
        });
      }
      return animate.call(this, frames, options);
    };
  });
  await explorations.click();
  await expect(page.locator("a[target='_blank']")).toHaveCount(3);
  expect(
    await page.evaluate(() =>
      Reflect.get(window, "reflows").some((record: { frames: Keyframe[] }) =>
        record.frames.some(
          (frame) =>
            typeof frame.transform === "string" &&
            frame.transform !== "translate(0, 0)",
        ),
      ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.locator("a[target='_blank']")).toHaveCount(8);
  expect(
    await page.evaluate(() =>
      Reflect.get(window, "reflows").some((record: { frames: Keyframe[] }) =>
        record.frames.some((frame) => frame.opacity === 0),
      ),
    ),
  ).toBe(true);
  await expect
    .poll(() =>
      page
        .locator("[data-project-id]")
        .evaluateAll(
          (elements) =>
            elements
              .flatMap((element) => element.getAnimations())
              .filter((animation) => animation.playState === "running").length,
        ),
    )
    .toBe(0);
  await testInfo.attach("filter-reflow-settled", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("rapid reversal, resize and reduced-motion changes cancel stale movement and settle latest membership", async ({
  page,
}) => {
  await page.goto("/work");
  const group = page.getByRole("group", { name: "Filter projects" });
  await expect(
    group.getByRole("button", { name: "All", exact: true }),
  ).toBeEnabled();
  await group.evaluate((element) => {
    const buttons = element.querySelectorAll("button");
    buttons[2].click();
    buttons[0].click();
  });
  await expect(page.locator("a[target='_blank']")).toHaveCount(8);
  await group
    .getByRole("button", { name: "Explorations", exact: true })
    .click();
  // Hold the real reflow so natural completion cannot masquerade as resize cancellation.
  const movingCards = await page
    .locator("[data-project-id]")
    .evaluateAll((elements) => {
      const animations = elements.flatMap((element) => element.getAnimations());
      animations.forEach((animation) => {
        animation.playbackRate = 0;
      });
      return animations.length;
    });
  expect(movingCards).toBeGreaterThan(0);
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect
    .poll(() =>
      page
        .locator("[data-project-id]")
        .evaluateAll(
          (elements) =>
            elements
              .flatMap((element) => element.getAnimations())
              .filter((animation) => animation.playState === "running").length,
        ),
    )
    .toBe(0);
  await group.getByRole("button", { name: "All", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page
        .locator("[data-project-id]")
        .evaluateAll(
          (elements) =>
            elements
              .flatMap((element) => element.getAnimations({ subtree: true }))
              .filter((animation) => animation.playState === "running").length,
        ),
    )
    .toBe(0);
  for (const label of ["Real projects", "Explorations", "All"]) {
    await group.getByRole("button", { name: label, exact: true }).click();
  }
  await expect(page.locator("a[target='_blank']")).toHaveCount(8);
  for (const element of await page.locator("[data-work-reveal]").all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
});

test("reduced motion initially and absent IntersectionObserver keep all content available", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/work");
  for (const element of await page.locator("[data-work-reveal]").all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  await expect(
    page.getByRole("button", { name: "Explorations", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Explorations", exact: true }).click();
  expect(
    await page
      .locator("[data-project-id]")
      .evaluateAll(
        (elements) =>
          elements.flatMap((element) =>
            element.getAnimations({ subtree: true }),
          ).length,
      ),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "IntersectionObserver");
  });
  await page.reload();
  for (const element of await page.locator("[data-work-reveal]").all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
});

test("restored scroll before hydration reveals controls without revisiting the heading", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("http://localhost:3100/work", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replace(
        /<script([^>]*\bsrc="[^"]+"[^>]*)>/g,
        '<script type="text/plain" data-delayed-work-hydration$1>',
      ),
    });
  });
  await page.goto("/work");
  const group = page.locator("[data-work-heading]");
  await group.evaluate((element) =>
    scrollTo(0, scrollY + element.getBoundingClientRect().bottom + 5),
  );
  const controls = page
    .getByRole("group", { name: "Filter projects" })
    .locator("..");
  expect(
    await group.evaluate((element) => element.getBoundingClientRect().bottom),
  ).toBeLessThan(0);
  expect((await controls.boundingBox())!.y).toBeGreaterThan(0);
  await page.evaluate(() => {
    for (const original of document.querySelectorAll<HTMLScriptElement>(
      "script[data-delayed-work-hydration]",
    )) {
      const script = document.createElement("script");
      for (const attribute of Array.from(original.attributes)) {
        if (
          attribute.name !== "type" &&
          attribute.name !== "data-delayed-work-hydration"
        ) {
          script.setAttribute(attribute.name, attribute.value);
        }
      }
      original.replaceWith(script);
    }
  });
  await expect(
    page.getByRole("button", { name: "All", exact: true }),
  ).toBeEnabled();
  await expect(controls).toHaveCSS("opacity", "1");
  expect(
    await group.evaluate((element) => element.getBoundingClientRect().bottom),
  ).toBeLessThan(0);
  await testInfo.attach("restored-scroll-controls-visible", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("a fast jump past the home heading cannot strand controls in a pending reveal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "All", exact: true }),
  ).toBeEnabled();
  const group = page.locator("[data-work-heading]");
  expect((await group.boundingBox())!.y).toBeGreaterThan(844);
  await group.evaluate((element) =>
    scrollTo(0, scrollY + element.getBoundingClientRect().bottom + 5),
  );
  await expect(
    page.getByRole("group", { name: "Filter projects" }).locator(".."),
  ).toHaveCSS("opacity", "1");
  expect(
    await group.evaluate((element) => element.getBoundingClientRect().bottom),
  ).toBeLessThan(0);
});
