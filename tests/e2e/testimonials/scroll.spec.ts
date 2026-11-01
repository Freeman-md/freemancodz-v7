import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });

async function fractions(section: Locator, theme = "dark") {
  return section
    .locator('figure[data-active="true"] blockquote [data-word-index]')
    .evaluateAll((words, theme) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const unread = theme === "dark" ? 148 : 89;
      const read = theme === "dark" ? 237 : 2;
      return words.map((word) => {
        context.fillStyle = getComputedStyle(word).color;
        context.fillRect(0, 0, 1, 1);
        return Math.max(
          0,
          Math.min(
            1,
            (context.getImageData(0, 0, 1, 1).data[0] - unread) /
              (read - unread),
          ),
        );
      });
    }, theme);
}

async function progress(section: Locator, theme = "dark") {
  const values = await fractions(section, theme);
  return values.reduce((total, value) => total + value, 0) / values.length;
}

async function settle(section: Locator) {
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
  await expect
    .poll(
      async () =>
        (await section.locator("[data-testimonial-stage]").boundingBox())!
          .height - (await section.getByRole("figure").boundingBox())!.height,
    )
    .toBeCloseTo(0, 0);
  await section.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function openSection(page: Page, theme = "dark") {
  await page.addInitScript(
    (value) => localStorage.setItem("freemancodz-v7-theme", value),
    theme,
  );
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  await expect(
    section.getByRole("button", { name: "Next testimonial" }),
  ).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  await section
    .getByRole("heading", { level: 2 })
    .evaluate((element) => element.focus({ preventScroll: true }));
  await settle(section);
  return section;
}

async function seekGeometric(page: Page, section: Locator, amount: number) {
  const geometry = await section
    .getByRole("blockquote")
    .evaluate((element) => ({
      top: element.getBoundingClientRect().top + scrollY,
      height: element.getBoundingClientRect().height,
      viewport: innerHeight,
    }));
  const target =
    geometry.top -
    geometry.viewport * 0.75 +
    amount * (geometry.height + geometry.viewport * 0.4);
  await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), target);
}

for (const theme of ["dark", "light"]) {
  test(`${theme} word colours advance, blend, hold and reverse without moving quote metrics`, async ({
    page,
  }, testInfo) => {
    const section = await openSection(page, theme);
    await seekGeometric(page, section, 0);
    await expect.poll(() => progress(section, theme)).toBeCloseTo(0, 2);
    const positions = await section.evaluate((element) =>
      [
        element.querySelector("h2")!,
        element.querySelector('figure[data-active="true"] blockquote')!,
        element.querySelector('figure[data-active="true"] figcaption')!,
      ].map((target) => {
        const bounds = target.getBoundingClientRect();
        return {
          top: bounds.top + scrollY,
          height: bounds.height,
          width: bounds.width,
        };
      }),
    );
    const wordCount = await section
      .getByRole("blockquote")
      .locator("[data-word-index]")
      .count();
    const partial = (Math.floor(wordCount / 2) + 0.45) / wordCount;
    await seekGeometric(page, section, partial);
    await expect.poll(() => progress(section, theme)).toBeCloseTo(partial, 2);
    const mixed = await fractions(section, theme);
    expect(mixed[0]).toBe(1);
    expect(mixed.at(-1)).toBe(0);
    expect(mixed.some((fraction) => fraction > 0.05 && fraction < 0.95)).toBe(
      true,
    );
    expect(mixed).toEqual([...mixed].sort((a, b) => b - a));
    await testInfo.attach(`testimonials-${theme}-partial-scroll`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.clock.install();
    await page.clock.fastForward(2000);
    expect(await fractions(section, theme)).toEqual(mixed);
    await page.clock.resume();
    await seekGeometric(page, section, 1);
    await expect.poll(() => progress(section, theme)).toBeCloseTo(1, 2);
    await seekGeometric(page, section, 0);
    await expect.poll(() => progress(section, theme)).toBeCloseTo(0, 2);
    const after = await section.evaluate((element) =>
      [
        element.querySelector("h2")!,
        element.querySelector('figure[data-active="true"] blockquote')!,
        element.querySelector('figure[data-active="true"] figcaption')!,
      ].map((target) => {
        const bounds = target.getBoundingClientRect();
        return {
          top: bounds.top + scrollY,
          height: bounds.height,
          width: bounds.width,
        };
      }),
    );
    expect(after).toEqual(positions);
    if (theme === "dark") {
      await seekGeometric(page, section, 0.2);
      await expect.poll(() => progress(section)).toBeCloseTo(0.2, 2);
      for (let index = 0; index < 6; index++) {
        await page.mouse.wheel(0, 40);
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            ),
        );
      }
      await expect.poll(() => progress(section)).toBeGreaterThan(0.4);
      for (let index = 0; index < 6; index++) {
        await page.mouse.wheel(0, -40);
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            ),
        );
      }
      await expect.poll(() => progress(section)).toBeCloseTo(0.2, 2);
    }
  });
}

test("selection retains normalized progress across every paragraph and remains reversible after browsing", async ({
  page,
}, testInfo) => {
  const section = await openSection(page);
  await seekGeometric(page, section, 0.4);
  await expect.poll(() => progress(section)).toBeCloseTo(0.4, 2);
  await section
    .getByRole("button", { name: "Next testimonial" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await settle(section);
  await expect.poll(() => progress(section)).toBeCloseTo(0.4, 2);
  const paragraphs = await section
    .getByRole("blockquote")
    .locator("p")
    .evaluateAll((elements) =>
      elements.map(
        (element) => element.querySelectorAll("[data-word-index]").length,
      ),
    );
  const count = paragraphs.reduce((total, value) => total + value, 0);
  const targetProgress = (paragraphs[0] + paragraphs[1] / 2 + 0.35) / count;
  const length = await section
    .getByRole("blockquote")
    .evaluate(
      (element) => element.getBoundingClientRect().height + innerHeight * 0.4,
    );
  await page.evaluate(
    (delta) => scrollBy({ top: delta, behavior: "instant" }),
    (targetProgress - 0.4) * length,
  );
  await expect.poll(() => progress(section)).toBeCloseTo(targetProgress, 2);
  const values = await fractions(section);
  expect(values.slice(0, paragraphs[0]).every((value) => value === 1)).toBe(
    true,
  );
  expect(
    values.slice(paragraphs[0] + paragraphs[1]).every((value) => value === 0),
  ).toBe(true);
  await testInfo.attach("testimonials-matin-global-paragraph-progress", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await section
    .getByRole("button", { name: "Next testimonial" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await settle(section);
  await expect.poll(() => progress(section)).toBeCloseTo(targetProgress, 2);
  const shortLength = await section
    .getByRole("blockquote")
    .evaluate(
      (element) => element.getBoundingClientRect().height + innerHeight * 0.4,
    );
  await page.evaluate(
    (delta) => scrollBy({ top: delta, behavior: "instant" }),
    -0.2 * shortLength,
  );
  await expect
    .poll(() => progress(section))
    .toBeCloseTo(targetProgress - 0.2, 2);
});

test("height animation holds reading progress while resize, fonts and preceding sections rebase layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const section = await openSection(page);
  await seekGeometric(page, section, 0.35);
  await expect.poll(() => progress(section)).toBeCloseTo(0.35, 2);
  await section
    .getByRole("button", { name: "Next testimonial" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect.poll(() => progress(section)).toBeCloseTo(0.35, 2);
  await settle(section);
  await expect.poll(() => progress(section)).toBeCloseTo(0.35, 2);
  await page.setViewportSize({ width: 820, height: 1180 });
  await settle(section);
  await expect.poll(() => progress(section)).toBeCloseTo(0.35, 2);
  await page
    .getByRole("button", { name: "Real projects", exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(
    page.getByRole("status").filter({ hasText: "4 projects" }),
  ).toHaveCount(1);
  await page
    .locator('section[aria-labelledby="work"]')
    .evaluate(async (element) => {
      await Promise.allSettled(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished),
      );
    });
  await settle(section);
  await expect.poll(() => progress(section)).toBeCloseTo(0.35, 2);
  await page
    .getByRole("button", { name: "AUTOMATION", exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await page.locator("#services").evaluate(async (element) => {
    await Promise.allSettled(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
  });
  await settle(section);
  await expect.poll(() => progress(section)).toBeCloseTo(0.35, 2);
  await section.getByRole("blockquote").evaluate((element) => {
    element.style.fontFamily = "monospace";
  });
  await settle(section);
  await expect.poll(() => progress(section)).toBeCloseTo(0.35, 2);
  const length = await section
    .getByRole("blockquote")
    .evaluate(
      (element) => element.getBoundingClientRect().height + innerHeight * 0.4,
    );
  await page.evaluate(
    (delta) => scrollBy({ top: delta, behavior: "instant" }),
    -0.1 * length,
  );
  await expect.poll(() => progress(section)).toBeCloseTo(0.25, 2);
  await page.evaluate(
    (delta) => scrollBy({ top: delta, behavior: "instant" }),
    0.1 * length,
  );
  await expect.poll(() => progress(section)).toBeCloseTo(0.35, 2);
});

test("forward and reverse wheel scrolling during height growth preserve genuine displacement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const section = await openSection(page);
  const next = section.getByRole("button", { name: "Next testimonial" });
  for (const direction of [1, -1]) {
    await seekGeometric(page, section, 0.3);
    await expect.poll(() => progress(section)).toBeCloseTo(0.3, 2);
    const retained = await progress(section);
    const initialPosition = await page.evaluate(() => scrollY);
    await next.evaluate((button: HTMLButtonElement) => button.click());
    await expect(section.getByRole("status")).toHaveText(
      "Matin Adebayo, testimonial 2 of 2",
    );
    const length = await section
      .getByRole("blockquote")
      .evaluate(
        (element) =>
          parseFloat(getComputedStyle(element).height) + 0.4 * innerHeight,
      );
    expect(
      await section
        .locator("[data-testimonial-stage]")
        .evaluate((element) =>
          element
            .getAnimations()
            .some(
              (animation) =>
                animation instanceof CSSTransition &&
                animation.transitionProperty === "height" &&
                animation.playState === "running",
            ),
        ),
    ).toBe(true);
    for (let index = 0; index < 10; index++) {
      await page.mouse.wheel(0, direction * 20);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          ),
      );
    }
    const displacement = (await page.evaluate(() => scrollY)) - initialPosition;
    expect(displacement * direction).toBeGreaterThan(100);
    const expected = Math.max(0, Math.min(1, retained + displacement / length));
    await settle(section);
    await expect.poll(() => progress(section)).toBeCloseTo(expected, 2);
    await next.evaluate((button: HTMLButtonElement) => button.click());
    await settle(section);
    await page.reload();
    await expect(next).toBeEnabled();
    await section
      .getByRole("heading", { level: 2 })
      .evaluate((element) => element.focus({ preventScroll: true }));
    await settle(section);
  }
});

test("viewport clamping during a stationary long-to-short switch does not change retained colour", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const section = await openSection(page);
  await seekGeometric(page, section, 0);
  await expect.poll(() => progress(section)).toBeCloseTo(0, 2);
  const next = section.getByRole("button", { name: "Next testimonial" });
  await next.evaluate((button: HTMLButtonElement) => button.click());
  await settle(section);
  const length = await section
    .getByRole("blockquote")
    .evaluate(
      (element) =>
        parseFloat(getComputedStyle(element).height) + 0.4 * innerHeight,
    );
  await page.evaluate(
    (delta) => scrollBy({ top: delta, behavior: "instant" }),
    length,
  );
  await expect.poll(() => progress(section)).toBeCloseTo(1, 2);
  const before = await page.evaluate(() => scrollY);
  await next.evaluate((button: HTMLButtonElement) => button.click());
  await settle(section);
  expect(await page.evaluate(() => scrollY)).toBeLessThan(before);
  await expect.poll(() => progress(section)).toBeCloseTo(1, 2);
  await page.evaluate(() => scrollBy({ top: -80, behavior: "instant" }));
  await expect.poll(() => progress(section)).toBeLessThan(0.95);
});

test("layout changes before arrival preserve the quotation-local reading interval", async ({
  page,
}) => {
  const section = await openSection(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Real projects", exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await page
    .locator('section[aria-labelledby="work"]')
    .evaluate(async (element) => {
      await Promise.allSettled(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished),
      );
    });
  await settle(section);
  await seekGeometric(page, section, 0);
  await expect.poll(() => progress(section)).toBeCloseTo(0, 2);
  await seekGeometric(page, section, 0.3);
  await expect.poll(() => progress(section)).toBeCloseTo(0.3, 2);
});

test("restored geometric position initializes current colour, and scrolling does not announce selection", async ({
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
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  const first = section.locator("figure").first().getByRole("blockquote");
  await first.evaluate((element) =>
    scrollTo({
      top:
        scrollY +
        element.getBoundingClientRect().top -
        innerHeight * 0.75 +
        0.45 * (element.getBoundingClientRect().height + innerHeight * 0.4),
      behavior: "instant",
    }),
  );
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
  await expect(
    section.getByRole("button", { name: "Next testimonial" }),
  ).toBeEnabled();
  const geometry = await section
    .getByRole("blockquote")
    .evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      height: element.getBoundingClientRect().height,
      viewport: innerHeight,
    }));
  const expected = Math.max(
    0,
    Math.min(
      1,
      (geometry.viewport * 0.75 - geometry.top) /
        (geometry.height + geometry.viewport * 0.4),
    ),
  );
  expect(expected).toBeGreaterThan(0.1);
  await expect.poll(() => progress(section)).toBeCloseTo(expected, 2);
  await section.getByRole("status").evaluate((element) => {
    Reflect.set(window, "testimonialAnnouncements", 0);
    const observer = new MutationObserver(() =>
      Reflect.set(
        window,
        "testimonialAnnouncements",
        Number(Reflect.get(window, "testimonialAnnouncements")) + 1,
      ),
    );
    observer.observe(element, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
  await page.evaluate(() => scrollBy({ top: 100, behavior: "instant" }));
  await section.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(
    await page.evaluate(() => Reflect.get(window, "testimonialAnnouncements")),
  ).toBe(0);
});

test("reduced motion overrides colour and switching immediately, then resumes current reversible mapping", async ({
  page,
}) => {
  const section = await openSection(page);
  await seekGeometric(page, section, 0.3);
  await expect.poll(() => progress(section)).toBeCloseTo(0.3, 2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => progress(section)).toBeCloseTo(1, 2);
  await section
    .getByRole("button", { name: "Next testimonial" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await settle(section);
  expect(await progress(section)).toBe(1);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => progress(section)).toBeCloseTo(0.3, 2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => progress(section)).toBe(1);
  const length = await section
    .getByRole("blockquote")
    .evaluate(
      (element) => element.getBoundingClientRect().height + innerHeight * 0.4,
    );
  await page.evaluate(
    (delta) => scrollBy({ top: delta, behavior: "instant" }),
    0.1 * length,
  );
  await section.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => progress(section)).toBeCloseTo(0.4, 2);
  await page.evaluate(
    (delta) => scrollBy({ top: delta, behavior: "instant" }),
    -0.2 * length,
  );
  await expect.poll(() => progress(section)).toBeCloseTo(0.2, 2);
});
