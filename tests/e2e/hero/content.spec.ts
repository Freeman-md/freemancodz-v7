import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 960 }, video: "on" });

const headline = "From first click. To a job well done.";
const copy =
  "I build intuitive interfaces and reliable workflows that simplify your business operations, using AI where it helps.";

test("initial HTML contains the complete semantic hero and exact content", async ({
  request,
}) => {
  const response = await request.get("/");
  const html = await response.text();
  expect(response.ok()).toBe(true);
  expect(html).toContain('id="hero-heading"');
  expect(html).toContain("From first click.");
  expect(html).toContain("To a job well done.");
  expect(html).toContain(copy);
  expect(html).toContain("Explore my work");
  expect(html).toContain('id="top" tabindex="-1"');
});

test("without JavaScript, copy, portrait and native Work link remain usable", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  await expect(
    page.getByRole("heading", { level: 1, name: headline }),
  ).toHaveCount(1);
  await expect(page.getByText(copy)).toBeVisible();
  await expect(page.getByText("Connected to what happens next")).toHaveCSS(
    "opacity",
    "1",
  );
  const image = page.getByRole("img", { name: /Freeman in profile/ });
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
  // Finite CSS entrances also complete without hydration.
  await expect(image.locator("../..")).toHaveCSS("opacity", "1");
  await testInfo.attach("no-javascript-hero", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.getByRole("link", { name: "Explore my work" }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#work")).toBeFocused();
  await context.close();
});

test("early keyboard focus reveals CTA immediately and activation focuses Work below the header", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  await page.locator("#top").focus();
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab",
  );
  const link = page.getByRole("link", { name: "Explore my work" });
  await expect(link).toBeFocused();
  await expect(link.locator("..")).toHaveCSS("opacity", "1");
  await expect(link.locator("..")).toHaveCSS("transform", "none");
  await expect(link).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#work")).toBeFocused();
  await expect
    .poll(() =>
      page
        .locator("#work")
        .evaluate((element) => Math.round(element.getBoundingClientRect().top)),
    )
    .toBe(104);
});

test("CTA preserves native navigation for modified clicks and other destinations", async ({
  page,
}) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Explore my work" });
  const prevented = await link.evaluate((element) => {
    const results: boolean[] = [];
    for (const modifier of ["ctrlKey", "metaKey", "shiftKey", "altKey"]) {
      const click = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        [modifier]: true,
      });
      // Observe prevention after React handles the event, but suppress browser side effects.
      window.addEventListener(
        "click",
        (event) => {
          results.push(event.defaultPrevented);
          event.preventDefault();
        },
        { once: true },
      );
      element.dispatchEvent(click);
    }
    element.setAttribute("href", "/future-destination");
    window.addEventListener(
      "click",
      (event) => {
        results.push(event.defaultPrevented);
        event.preventDefault();
      },
      { once: true },
    );
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    element.setAttribute("href", "https://example.com/");
    window.addEventListener(
      "click",
      (event) => {
        results.push(event.defaultPrevented);
        event.preventDefault();
      },
      { once: true },
    );
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    return results;
  });
  expect(prevented).toEqual([false, false, false, false, false, false]);
  await expect(page).toHaveURL("/");
});

test("one native disabled assistant has no dialog, while the logo returns and focuses actual top", async ({
  page,
}) => {
  await page.goto("/");
  const assistant = page.getByRole("button", {
    name: "AI assistant — coming soon",
  });
  await expect(assistant).toHaveCount(1);
  await expect(assistant).toBeDisabled();
  await expect(assistant).toHaveAttribute("type", "button");
  await expect(assistant).not.toHaveAttribute("aria-haspopup");
  await page.getByRole("link", { name: "Work", exact: true }).click();
  await expect(page.locator("#work")).toBeFocused();
  await page
    .getByRole("link", { name: "Freemancodz home" })
    .filter({ visible: true })
    .click();
  await expect(page.locator("#top")).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
