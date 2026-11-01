import { expect, test } from "@playwright/test";

const quotations = [
  "Freeman is a pragmatic developer, pays attains to details and easy to work with. I highly recommend him as a go to person for your next frontend development project. His deliveries are top tier.",
  "I had the pleasure of collaborating with Freeman on the development of TRU, a comprehensive marketplace platform, where I worked as a mobile developer during a contract term. Freeman led the development of TRU, orchestrating a multifaceted team including stakeholders, project managers, backend and mobile app developers, as well as UI/UX designers.\n\nDuring my time working with Freeman, I witnessed a significant improvement in my own skills. Freeman possesses a remarkable intellect, exceptional project management skills, and an ability to transform complex concepts into intuitive designs. Additionally, Freeman demonstrates patience tempered with expertise.\n\nI wholeheartedly recommend Freeman to anyone seeking a highly skilled, motivated, and team-oriented leader who can navigate complex projects with expertise and grace.",
];

test("initial HTML contains both exact complete quotations and original sources", async ({
  request,
}) => {
  const response = await request.get("/");
  const html = await response.text();
  const quotes = [
    ...html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g),
  ];
  expect(quotes).toHaveLength(2);
  for (const [index, quote] of quotes.entries()) {
    const paragraphs = [...quote[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(
      (paragraph) => paragraph[1].replace(/<[^>]*>/g, ""),
    );
    expect(paragraphs.join("\n\n")).toBe(quotations[index]);
  }
  expect(html).toContain(
    'href="https://www.linkedin.com/in/emmanuel-nelson-7a4b3263/"',
  );
  expect(html).toContain('href="https://www.linkedin.com/in/matin-adebayo/"');
});

test("manual forward/back wrap synchronizes semantics, counter, source and polite author status", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  const next = section.getByRole("button", { name: "Next testimonial" });
  const previous = section.getByRole("button", {
    name: "Previous testimonial",
  });
  await expect(next).toBeEnabled();
  await expect(section.getByRole("figure")).toHaveCount(1);
  await expect(section.getByText("01 / 02", { exact: true })).toBeVisible();
  await expect(section.getByRole("blockquote").locator("p")).toHaveText([
    quotations[0],
  ]);
  const source = section.getByRole("link", {
    name: "Emmanuel Nelson",
    exact: true,
  });
  await expect(source).toHaveAttribute("target", "_blank");
  await expect(source).toHaveAttribute("rel", "noopener noreferrer");
  await expect(section.getByRole("status")).toHaveAttribute(
    "aria-live",
    "polite",
  );
  await expect(section.getByRole("status")).toHaveAttribute(
    "aria-atomic",
    "true",
  );
  await previous.click();
  await expect(previous).toBeFocused();
  await expect(section.getByText("02 / 02", { exact: true })).toBeVisible();
  await expect(section.getByRole("blockquote").locator("p")).toHaveText(
    quotations[1].split("\n\n"),
  );
  await expect(
    section.getByRole("link", { name: "Matin Adebayo" }),
  ).toHaveAttribute("href", "https://www.linkedin.com/in/matin-adebayo/");
  await expect(
    section.getByText("Software Developer at Avrion", { exact: true }),
  ).toBeVisible();
  await expect(
    section
      .locator('figure[data-active="true"] figcaption')
      .getByText("MA", { exact: true }),
  ).toHaveCount(1);
  await expect(section.getByRole("status")).toHaveText(
    "Matin Adebayo, testimonial 2 of 2",
  );
  await expect(
    section.getByRole("link", { name: "Emmanuel Nelson" }),
  ).toHaveCount(0);
  await next.click();
  await expect(next).toBeFocused();
  await expect(section.getByRole("status")).toHaveText(
    "Emmanuel Nelson, testimonial 1 of 2",
  );
  await next.click();
  await expect(section.getByRole("status")).toHaveText(
    "Matin Adebayo, testimonial 2 of 2",
  );
  const wordIndices = await section
    .getByRole("blockquote")
    .locator("[data-word-index]")
    .evaluateAll((elements) =>
      elements.map((element) =>
        Number((element as HTMLElement).dataset.wordIndex),
      ),
    );
  expect(wordIndices).toEqual(wordIndices.map((_, index) => index));
  expect(
    await section
      .getByRole("blockquote")
      .locator("[aria-label], [tabindex]")
      .count(),
  ).toBe(0);
});

test("Enter/Space, focus retention and rapid interrupted selections keep only the newest links accessible", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  const next = section.getByRole("button", { name: "Next testimonial" });
  await next.focus();
  await expect(section.getByText("01 / 02", { exact: true })).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(next).toBeFocused();
  await expect(
    section.getByRole("link", { name: "Emmanuel Nelson" }),
  ).toHaveCount(0);
  await expect(
    section.locator('figure[data-testimonial="emmanuel-nelson"]'),
  ).toHaveAttribute("inert", "");
  await page.keyboard.press("Space");
  await expect(section.getByText("01 / 02", { exact: true })).toHaveCount(1);
  await next.evaluate((button: HTMLButtonElement) => {
    for (let index = 0; index < 5; index++) {
      button.click();
    }
  });
  await expect(section.getByRole("status")).toHaveText(
    "Matin Adebayo, testimonial 2 of 2",
  );
  await expect(section.getByRole("figure")).toHaveCount(1);
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab",
  );
  await expect(
    section.getByRole("link", { name: "Matin Adebayo" }),
  ).toBeFocused();
  const fit = await section
    .locator("[data-testimonial-stage]")
    .evaluate((stage) => ({
      stage: stage.getBoundingClientRect().height,
      figure: stage
        .querySelector<HTMLElement>('figure[data-active="true"]')!
        .getBoundingClientRect().height,
      scrollTop: stage.scrollTop,
    }));
  expect(fit.stage).toBeCloseTo(fit.figure, 0);
  expect(fit.scrollTop).toBe(0);
});

test("touch controls select manually with retained focus", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  const next = section.getByRole("button", { name: "Next testimonial" });
  await next.tap();
  await expect(next).toBeFocused();
  await expect(section.getByRole("status")).toHaveText(
    "Matin Adebayo, testimonial 2 of 2",
  );
  await section.getByRole("button", { name: "Previous testimonial" }).tap();
  await expect(section.getByRole("status")).toHaveText(
    "Emmanuel Nelson, testimonial 1 of 2",
  );
  await context.close();
});

test("without JavaScript both full figures and source links remain readable with disabled controls", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  const section = page.getByRole("region", {
    name: "/ THEIR WORDS",
    exact: true,
  });
  await expect(section.getByRole("figure")).toHaveCount(2);
  for (const button of await section.getByRole("button").all()) {
    await expect(button).toBeDisabled();
  }
  for (const [index, figure] of (
    await section.getByRole("figure").all()
  ).entries()) {
    await expect(figure.getByRole("blockquote").locator("p")).toHaveText(
      quotations[index].split("\n\n"),
    );
    await expect(figure.getByRole("link")).toBeVisible();
    await expect(figure).toHaveCSS("opacity", "1");
  }
  await testInfo.attach("testimonials-static-both-quotes", {
    body: await section.screenshot(),
    contentType: "image/png",
  });
  await context.close();
});

test("hydration initializes Emmanuel without a height or slide transition", async ({
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
  await expect(section.getByRole("figure")).toHaveCount(2);
  await page.evaluate(() => {
    const transitions: string[] = [];
    Reflect.set(window, "testimonialInitializationTransitions", transitions);
    document
      .querySelector('section[aria-labelledby="testimonials"]')!
      .addEventListener("transitionrun", (event) =>
        transitions.push((event as TransitionEvent).propertyName),
      );
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
  await expect(section.getByRole("figure")).toHaveCount(1);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(
    await page.evaluate(() =>
      Reflect.get(window, "testimonialInitializationTransitions"),
    ),
  ).toEqual([]);
});
