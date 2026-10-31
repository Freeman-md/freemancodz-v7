import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });
const webCopy =
  "Websites and web apps that make it easier to discover, order, book or enquire.";
const automationCopy =
  "Connected tools and reliable handoffs that take repetitive administration out of your day.";

test("exact content, section order, full native headers and accessible panel relationships", async ({
  page,
  request,
}) => {
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
  await expect(web).toBeEnabled();
  await expect(web).toHaveAttribute("aria-expanded", "true");
  await expect(automation).toHaveAttribute("aria-expanded", "false");
  await expect(section.getByRole("button")).toHaveCount(2);
  await expect(section.getByRole("link")).toHaveCount(0);
  await expect(
    section.getByRole("heading", { level: 2, name: "/ SERVICES" }),
  ).toHaveAttribute("tabindex", "-1");
  await expect(
    section.getByRole("region", { name: "WEB DEVELOPMENT", exact: true }),
  ).toHaveText(webCopy + "JPScents · a real fragrance storefront");
  await expect(
    section.getByRole("region", { name: "AUTOMATION", exact: true }),
  ).toHaveCount(0);
  const panelId = await web.getAttribute("aria-controls");
  await expect(page.locator(`#${panelId}`)).toHaveAttribute(
    "aria-labelledby",
    (await web.getAttribute("id")) as string,
  );
  expect(
    await page
      .locator("main > section")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("aria-labelledby")),
      ),
  ).toEqual([
    "hero-heading",
    "work",
    "services-title",
    "experience",
    "contact",
  ]);
  const html = await (await request.get("/")).text();
  expect(html).toContain(webCopy);
  expect(html).toContain(automationCopy);
  expect(html).toContain("JPScents · a real fragrance storefront");
  expect(html).toContain("Email PA · illustrated workflow with example data");
  expect(html).not.toContain("For your customers. For the work behind them.");
});

test("icon/header click and Enter/Space open, switch and close while retaining visible focus", async ({
  page,
}) => {
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
  const bounds = (await web.boundingBox())!;
  await web.click({ position: { x: bounds.width - 22, y: bounds.height / 2 } });
  await expect(web).toHaveAttribute("aria-expanded", "false");
  await expect(section.getByRole("region")).toHaveCount(0);
  await expect(web).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(web).toHaveAttribute("aria-expanded", "true");
  await automation.focus();
  await expect(web).toHaveAttribute("aria-expanded", "true");
  await expect(automation).toHaveAttribute("aria-expanded", "false");
  await expect(automation).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Space");
  await expect(automation).toHaveAttribute("aria-expanded", "true");
  await expect(web).toHaveAttribute("aria-expanded", "false");
  await expect(automation).toBeFocused();
  await expect(
    section.getByRole("region", { name: "WEB DEVELOPMENT", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("#service-web-development-panel")).toHaveAttribute(
    "inert",
    "",
  );
  await page.keyboard.press("Enter");
  await expect(section.getByRole("region")).toHaveCount(0);
  await expect(automation).toHaveAttribute("aria-expanded", "false");
});

test("mouse hover intent, exit cancellation, explicit override and close-until-reentry", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
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
  await automation.scrollIntoViewIfNeeded();
  await expect(automation).toBeEnabled();
  await page.clock.install({ time: new Date("2026-10-31T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T12:00:01Z"));
  await automation.hover();
  await expect(web).toHaveAttribute("aria-expanded", "true");
  await page.clock.fastForward(500);
  await expect(automation).toHaveAttribute("aria-expanded", "true");
  await page.mouse.move(0, 0);
  await page.clock.fastForward(500);
  await expect(automation).toHaveAttribute("aria-expanded", "true");
  await web.hover();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(500);
  await expect(automation).toHaveAttribute("aria-expanded", "true");
  await automation.hover();
  await automation.click();
  await page.clock.fastForward(1000);
  await expect(automation).toHaveAttribute("aria-expanded", "false");
  await page.mouse.move(0, 0);
  await automation.hover();
  await page.clock.fastForward(500);
  await expect(automation).toHaveAttribute("aria-expanded", "true");
  await web.hover();
  await automation.focus();
  await page.keyboard.press("Enter");
  await page.clock.fastForward(500);
  await expect(web).toHaveAttribute("aria-expanded", "false");
  await expect(automation).toHaveAttribute("aria-expanded", "false");
});

test("touch activates only the requested header and keeps its focus", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  const section = page.getByRole("region", { name: "/ SERVICES", exact: true });
  const web = section.getByRole("button", {
    name: "WEB DEVELOPMENT",
    exact: true,
  });
  const automation = section.getByRole("button", {
    name: "AUTOMATION",
    exact: true,
  });
  await web.tap();
  await expect(web).toHaveAttribute("aria-expanded", "false");
  await automation.tap();
  await expect(automation).toHaveAttribute("aria-expanded", "true");
  await expect(automation).toBeFocused();
  await expect(web).toHaveAttribute("aria-expanded", "false");
  await context.close();
});

test("no JavaScript keeps both complete details and previews readable with disabled controls", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  const section = page.getByRole("region", { name: "/ SERVICES", exact: true });
  await expect(
    section.getByRole("button", { name: "WEB DEVELOPMENT", exact: true }),
  ).toBeDisabled();
  await expect(
    section.getByRole("button", { name: "AUTOMATION", exact: true }),
  ).toBeDisabled();
  await expect(section.getByRole("region")).toHaveCount(2);
  await expect(section.getByText(webCopy)).toBeVisible();
  await expect(section.getByText(automationCopy)).toBeVisible();
  await expect(
    section.getByRole("img", { name: /Outlook to Airtable/ }),
  ).toHaveCount(1);
  await testInfo.attach("services-no-javascript", {
    body: await section.screenshot({
      style: "header { opacity: 0 !important; }",
    }),
    contentType: "image/png",
  });
  await context.close();
});

test("hydration agrees with static details, then initializes Web without panel transitions", async ({
  page,
}) => {
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
  await page.goto("/");
  const section = page.getByRole("region", { name: "/ SERVICES", exact: true });
  await expect(section.getByRole("region")).toHaveCount(2);
  await expect(
    section.getByRole("button", { name: "AUTOMATION", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => {
    const transitions: string[] = [];
    Reflect.set(window, "serviceInitializationTransitions", transitions);
    document
      .getElementById("services")!
      .addEventListener("transitionrun", (event) =>
        transitions.push((event as TransitionEvent).propertyName),
      );
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
  await expect(
    section.getByRole("button", { name: "WEB DEVELOPMENT", exact: true }),
  ).toBeEnabled();
  await expect(
    section.getByRole("button", { name: "AUTOMATION", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(
    await page.evaluate(() =>
      Reflect.get(window, "serviceInitializationTransitions"),
    ),
  ).toEqual([]);
});
