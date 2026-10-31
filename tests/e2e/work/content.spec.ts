import { expect, test } from "@playwright/test";

const expected = [
  [
    "JPScents",
    "Fragrance storefront",
    "https://jpscents.shop/",
    "Real project",
    "Web app|E-commerce|Novier Labs",
  ],
  [
    "Debby Art & Prints",
    "Art & print enquiries",
    "https://debbyarts.vercel.app/",
    "Real project",
    "Web app|Guided enquiries|Novier Labs",
  ],
  [
    "Pay4Me",
    "Tuition payments",
    "https://withradius.com/",
    "Real project",
    "Payments|Frontend|Team contribution",
  ],
  [
    "Email PA",
    "Application-tracker automation",
    "https://github.com/Freeman-md/email-pa",
    "Real project",
    "Automation|Email|Integrations",
  ],
  [
    "Interface Studies",
    "Small interfaces, considered interactions",
    "https://github.com/Freeman-md/ui-builds",
    "Exploration",
    "Search|Booking|Inbox triage",
  ],
  [
    "Across the Horizon",
    "Study-abroad experiences",
    "https://acrossthehorizon.net/",
    "Real project",
    "Web app|Frontend|Team contribution",
  ],
  [
    "Email Sequencer",
    "Reviewed outreach and follow-ups",
    "https://github.com/Freeman-md/email-sequencer",
    "Exploration",
    "Automation|Gmail|Workflow illustration",
  ],
  [
    "Self-Healing Backend Ops",
    "Recovery with guardrails",
    "https://github.com/Freeman-md/self-healing-backend-ops",
    "Exploration",
    "MSc research|Systems|Workflow illustration",
  ],
];

for (const route of ["/", "/work"]) {
  test(`${route} preserves ordered records, semantics, genuine assets and one shell`, async ({
    page,
    request,
  }) => {
    await page.goto(route);
    const work = page.getByRole("region", { name: "/ SELECTED WORK" });
    const count = route === "/" ? 5 : 8;
    await expect(
      work.getByRole("heading", {
        level: route === "/" ? 2 : 1,
        name: "/ SELECTED WORK",
      }),
    ).toHaveAttribute("id", "work");
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const cards = work.locator("a[target='_blank']");
    await expect(cards).toHaveCount(count);
    for (let index = 0; index < count; index += 1) {
      const [title, description, href, classification, tags] = expected[index];
      const card = cards.nth(index);
      await expect(
        card.getByRole("heading", { level: route === "/" ? 3 : 2 }),
      ).toHaveText(`${title}— ${description}`);
      await expect(card).toHaveAttribute("href", href);
      await expect(card).toHaveAttribute("rel", "noopener noreferrer");
      await expect(card.getByText(classification, { exact: true })).toHaveCount(
        1,
      );
      expect(await card.getByRole("listitem").allTextContents()).toEqual(
        tags.split("|"),
      );
      await expect(card.getByRole("button")).toHaveCount(0);
    }
    for (const image of await work
      .getByRole("img")
      .filter({ hasNot: page.locator("svg") })
      .all()) {
      if (await image.evaluate((element) => element.tagName === "IMG")) {
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (element: HTMLImageElement) =>
                element.complete && element.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
    }
    await expect(
      page.getByRole("button", { name: "AI assistant — coming soon" }),
    ).toHaveCount(1);
    await expect(page.locator('[data-site-header="desktop"]')).toHaveCount(1);
    await expect(work.getByRole("link", { name: "View all work" })).toHaveCount(
      route === "/" ? 1 : 0,
    );
    const html = await (await request.get(route)).text();
    for (const [title, description] of expected.slice(0, count)) {
      expect(html).toContain(title.replaceAll("&", "&amp;"));
      expect(html).toContain(description.replaceAll("&", "&amp;"));
    }
    expect(html).not.toContain("Here's that thinking in practice.");
  });

  test(`${route} without JavaScript keeps every project readable and links native`, async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto(`http://localhost:3100${route}`);
    const work = page.getByRole("region", { name: "/ SELECTED WORK" });
    await expect(work.locator("a[target='_blank']")).toHaveCount(
      route === "/" ? 5 : 8,
    );
    await expect(
      work.getByRole("button", { name: "Explorations" }),
    ).toBeDisabled();
    const last = work.locator("a[target='_blank']").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toHaveCSS("opacity", "1");
    expect(
      await last.evaluate((element) => {
        let current: Element | null = element;
        while (current) {
          if (getComputedStyle(current).opacity === "0") {
            return false;
          }
          current = current.parentElement;
        }
        return true;
      }),
    ).toBe(true);
    await testInfo.attach(`no-js-${route === "/" ? "home" : "collection"}`, {
      body: await work.screenshot(),
      contentType: "image/png",
    });
    if (route === "/") {
      await work.getByRole("link", { name: "View all work" }).click();
      await expect(page).toHaveURL(/\/work$/);
      await expect(page.locator("a[target='_blank']")).toHaveCount(8);
    }
    await context.close();
  });
}
