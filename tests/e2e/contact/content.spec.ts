import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, video: "on" });

const heading = "HAVE A PROJECT IN MIND?";
const copy =
  "Let’s build intuitive interfaces and reliable workflows that make your business easier to run.";
const destinations = [
  ["Contact Me", "mailto:freemanmadudili@gmail.com"],
  [
    "Freemancodz on Contra",
    "https://contra.com/freeman_madudili_xs81lv56?referralExperimentNid=DEFAULT_REFERRAL_PROGRAM&referrerUsername=freeman_madudili_xs81lv56",
  ],
  ["LinkedIn", "https://www.linkedin.com/in/freeman-madudili-9864101a2/"],
  ["X", "https://x.com/freemancodz"],
  ["GitHub", "https://github.com/Freeman-md"],
] as const;

test("initial HTML includes the complete section, original-photo asset and confirmed destinations", async ({
  request,
}) => {
  const response = await request.get("/");
  const html = await response.text();
  expect(response.ok()).toBe(true);
  expect(html).toContain('id="contact" tabindex="-1"');
  expect(html).toContain("HAVE A PROJECT");
  expect(html).toContain("IN MIND?");
  expect(html).toContain(copy);
  expect(html).toContain("Available for new projects");
  for (const [, href] of destinations) {
    expect(html).toContain(href.replaceAll("&", "&amp;"));
  }
  expect(html).toContain("%2Fimages%2Fcontact%2Fportrait.webp");
  expect(html).not.toContain('data-contact-state="pending"');
});

test("exact content, native link order and safe external semantics preserve the single assistant", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: heading, exact: true });
  await section.getByRole("heading").focus();
  await expect(section).toHaveCount(1);
  await expect(section.getByRole("heading", { level: 2 })).toHaveText(heading);
  await expect(section.getByText(copy)).toBeVisible();
  await expect(section.getByText("Available for new projects")).toHaveCount(1);
  await expect(section.getByRole("link")).toHaveCount(5);
  expect(await section.getByRole("link").allTextContents()).toEqual([
    "Contact Me",
    "Freemancodz",
    "LinkedIn",
    "X",
    "GitHub",
  ]);
  for (const [index, [name, href]] of destinations.entries()) {
    const link = section.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", href);
    if (index === 0) {
      await expect(link).not.toHaveAttribute("target");
    } else {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  }
  await expect(section.getByRole("img")).toHaveCount(0);
  await expect(section.locator("img[alt='']")).toHaveCount(4);
  const assistant = page.getByRole("button", {
    name: "AI assistant — coming soon",
    exact: true,
  });
  await expect(assistant).toHaveCount(1);
  await expect(assistant).toBeDisabled();
  expect(
    await section.evaluate((element) =>
      element.previousElementSibling?.getAttribute("aria-labelledby"),
    ),
  ).toBe("testimonials");
});

test("native and modified activation is not intercepted, without opening a real destination", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: heading, exact: true });
  await section.getByRole("heading").focus();
  for (const [name] of destinations) {
    const results = await section
      .getByRole("link", { name, exact: true })
      .evaluate((element) => {
        const prevented: boolean[] = [];
        for (const modifiers of [
          {},
          { ctrlKey: true },
          { metaKey: true },
          { shiftKey: true },
          { altKey: true },
        ]) {
          window.addEventListener(
            "click",
            (event) => {
              prevented.push(event.defaultPrevented);
              // Record application semantics, then prevent the test from launching mail/profile apps.
              event.preventDefault();
            },
            { once: true },
          );
          element.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              button: 0,
              ...modifiers,
            }),
          );
        }
        return prevented;
      });
    expect(results).toEqual([false, false, false, false, false]);
  }
  await expect(page).toHaveURL("http://localhost:3100/");
});

test("keyboard order follows the five complete pills and focus reveals pending context", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: heading, exact: true });
  await section.getByRole("heading").focus();
  for (const [name] of destinations) {
    await page.keyboard.press(
      browserName === "webkit" && process.platform === "darwin"
        ? "Alt+Tab"
        : "Tab",
    );
    const link = section.getByRole("link", { name, exact: true });
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS("outline-style", "solid");
    await expect(link).toHaveCSS("opacity", "1");
  }
  await expect(section).toHaveAttribute("data-contact-state", "complete");
});

test("without JavaScript all copy, artwork and links are readable in natural flow", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  const section = page.getByRole("region", { name: heading, exact: true });
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading")).toBeVisible();
  await expect(section.getByText(copy)).toBeVisible();
  await expect(section.getByRole("link")).toHaveCount(5);
  await expect(section).not.toHaveAttribute("data-contact-state");
  for (const image of await section.locator("img").all()) {
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  await testInfo.attach("contact-no-javascript", {
    body: await section.screenshot(),
    contentType: "image/png",
  });
  await context.close();
});
