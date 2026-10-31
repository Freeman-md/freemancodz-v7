import { expect, test } from "@playwright/test";

test.use({ video: "on" });
for (const viewport of [
  { width: 1440, height: 960, columns: 3 },
  { width: 390, height: 844, columns: 1 },
  { width: 820, height: 1180, columns: 2 },
  { width: 320, height: 844, columns: 1 },
]) {
  for (const theme of viewport.width === 1440 || viewport.width === 390
    ? ["dark", "light"]
    : ["dark"]) {
    test(`${viewport.width}px ${theme} layout has natural row heights, readable spacing and reference geometry`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(
        (value) => localStorage.setItem("freemancodz-v7-theme", value),
        theme,
      );
      await page.goto("/work");
      await page.emulateMedia({ reducedMotion: "reduce" });
      const work = page.getByRole("region", { name: "/ SELECTED WORK" });
      const cards = work.locator("a[target='_blank']");
      for (const card of await cards.all()) {
        await card.scrollIntoViewIfNeeded();
      }
      await page.evaluate(() => scrollTo(0, 0));
      const geometry = await cards.evaluateAll((elements) =>
        elements.map((element) => {
          const bounds = element.getBoundingClientRect();
          const visual = element.firstElementChild!.getBoundingClientRect();
          const metadata = getComputedStyle(element.lastElementChild!);
          return {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            visualWidth: visual.width,
            visualHeight: visual.height,
            paddingTop: parseFloat(metadata.paddingTop),
            paddingBottom: parseFloat(metadata.paddingBottom),
          };
        }),
      );
      expect(geometry[0].x).toBe(viewport.width >= 1024 ? 80 : 24);
      expect(
        geometry.filter((card) => Math.abs(card.y - geometry[0].y) < 1),
      ).toHaveLength(viewport.columns);
      for (let index = 0; index < geometry.length; index += viewport.columns) {
        const row = geometry.slice(index, index + viewport.columns);
        if (viewport.columns > 1) {
          expect(
            Math.max(...row.map((card) => card.height)) -
              Math.min(...row.map((card) => card.height)),
          ).toBeLessThan(1);
        }
        expect(row[0].x).toBe(geometry[0].x);
      }
      if (viewport.columns === 1) {
        expect(
          new Set(geometry.map((card) => Math.round(card.height))).size,
        ).toBeGreaterThan(1);
      }
      expect(geometry[0].paddingTop).toBe(viewport.columns > 1 ? 23 : 20);
      expect(geometry[0].paddingBottom).toBe(geometry[0].paddingTop);
      expect(geometry[0].visualWidth / geometry[0].visualHeight).toBeCloseTo(
        viewport.columns > 1 ? 406 / 302 : 340 / 262,
        2,
      );
      const heading = page.getByRole("heading", {
        level: 1,
        name: "/ SELECTED WORK",
      });
      expect((await heading.boundingBox())!.y).toBeGreaterThan(104);
      await expect(heading).toHaveCSS(
        "font-size",
        viewport.width >= 1024 ? "48px" : "28px",
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(viewport.width);
      await expect(work).toHaveCSS(
        "color",
        theme === "dark" ? "rgb(237, 242, 239)" : "rgb(2, 12, 27)",
      );
      await testInfo.attach(`collection-${viewport.width}-${theme}`, {
        body: await work.screenshot({
          style:
            "header, button[aria-label='AI assistant — coming soon'] { opacity: 0 !important; } section[aria-labelledby='work'] { width: 100% !important; max-width: none !important; padding-inline: var(--page-gutter) !important; }",
        }),
        contentType: "image/png",
      });
      await page.goto("/");
      await page.emulateMedia({ reducedMotion: "reduce" });
      const homeWork = page.getByRole("region", { name: "/ SELECTED WORK" });
      if (viewport.width < 1024) {
        const filterBounds = (await homeWork
          .getByRole("group", { name: "Filter projects" })
          .boundingBox())!;
        const actionBounds = (await homeWork
          .getByRole("link", { name: "View all work" })
          .boundingBox())!;
        expect(
          actionBounds.x - filterBounds.x - filterBounds.width,
        ).toBeCloseTo(8, 0);
      }
      await testInfo.attach(`home-work-${viewport.width}-${theme}`, {
        body: await homeWork.screenshot({
          style:
            "header, button[aria-label='AI assistant — coming soon'] { opacity: 0 !important; } section[aria-labelledby='work'] { width: 100% !important; max-width: none !important; padding-inline: var(--page-gutter) !important; }",
        }),
        contentType: "image/png",
      });
    });
  }
}
