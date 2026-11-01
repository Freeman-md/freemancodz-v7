import { expect, test } from "@playwright/test";

test("exact employment history, fixed summary, unique heading and static semantic list", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "/ EXPERIENCE",
    exact: true,
  });
  await expect(page.locator("#experience")).toHaveCount(1);
  await expect(section.getByRole("heading", { level: 2 })).toHaveAttribute(
    "id",
    "experience",
  );
  await expect(section.getByRole("heading", { level: 2 })).toHaveAttribute(
    "tabindex",
    "-1",
  );
  await expect(
    section.getByText("3+ years of experience", { exact: true }),
  ).toHaveCount(1);
  await expect(section.getByRole("list")).toHaveCount(1);
  await expect(section.getByRole("listitem")).toHaveCount(3);
  await expect(section.getByRole("heading", { level: 3 })).toHaveText([
    "Freemancodz",
    "Novier Labs",
    "Pay4Me",
  ]);
  const rows = section.getByRole("listitem");
  await expect(rows.nth(0)).toHaveText(
    "FreemancodzProduct EngineerAug 2025 – Present",
  );
  await expect(rows.nth(1)).toHaveText(
    "Novier LabsSoftware EngineerAug 2023 – Jul 2025",
  );
  await expect(rows.nth(2)).toHaveText(
    "Pay4MeFrontend DeveloperJan 2022 – Feb 2023",
  );
  expect(
    await section.locator("a, button, svg, [tabindex]:not(h2)").count(),
  ).toBe(0);
  await expect(
    section.locator('[data-section-part="watermark"]'),
  ).toHaveAttribute("aria-hidden", "true");
  const ordering = await page
    .locator("main > section")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("aria-labelledby")),
    );
  expect(ordering).toEqual([
    "hero-heading",
    "work",
    "services-title",
    "experience",
    "contact",
  ]);
});

test("all employment copy and summary are in initial HTML without a mounted render gate", async ({
  request,
}) => {
  const response = await request.get("/");
  const html = await response.text();
  for (const content of [
    "/ EXPERIENCE",
    "3+ years of experience",
    "Freemancodz",
    "Product Engineer",
    "Aug 2025 – Present",
    "Novier Labs",
    "Software Engineer",
    "Aug 2023 – Jul 2025",
    "Pay4Me",
    "Frontend Developer",
    "Jan 2022 – Feb 2023",
  ]) {
    expect(html).toContain(content);
  }
  expect(html).toContain('<h2 id="experience" tabindex="-1"');
});

test("no JavaScript preserves readable employment rows, heading and summary", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  const section = page.getByRole("region", {
    name: "/ EXPERIENCE",
    exact: true,
  });
  await section.scrollIntoViewIfNeeded();
  for (const element of await section.locator("h2, h3, li, p").all()) {
    await expect(element).toBeVisible();
    await expect(element).toHaveCSS("opacity", "1");
  }
  await testInfo.attach("experience-static-no-javascript", {
    body: await section.screenshot(),
    contentType: "image/png",
  });
  await context.close();
});
