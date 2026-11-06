import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 960 },
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 320, height: 844 },
  { width: 360, height: 844 },
  { width: 365, height: 844 },
]) {
  for (const theme of viewport.width === 1440 || viewport.width === 390
    ? ["dark", "light"]
    : ["dark"]) {
    test(`${viewport.width}px ${theme} optical alignment, employment rhythm and natural dates`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(
        (value) => localStorage.setItem("freemancodz-v7-theme", value),
        theme,
      );
      await page.goto("/");
      const section = page.getByRole("region", {
        name: "/ EXPERIENCE",
        exact: true,
      });
      await section.scrollIntoViewIfNeeded();
      const desktop = viewport.width >= 1024;
      const narrow = viewport.width < 360;
      const bounds = (await section.boundingBox())!;
      const heading = section.getByRole("heading", { level: 2 });
      const title = (await heading.boundingBox())!;
      const watermark = section.locator('[data-section-part="watermark"]');
      const watermarkBounds = (await watermark.boundingBox())!;
      const summary = section.getByText("3+ years of experience", {
        exact: true,
      });
      const summaryBounds = (await summary.boundingBox())!;
      expect(bounds.x).toBe(desktop ? 80 : 24);
      expect(title.x).toBe(bounds.x);
      expect(watermarkBounds.x).toBe(bounds.x);
      expect(
        Math.abs(
          title.y + title.height - watermarkBounds.y - watermarkBounds.height,
        ),
      ).toBeLessThanOrEqual(5);
      expect(summaryBounds.x).toBeGreaterThan(title.x + title.width + 8);
      expect(summaryBounds.x + summaryBounds.width).toBeCloseTo(
        bounds.x + bounds.width,
        0,
      );
      expect(
        Math.abs(
          title.y + title.height - summaryBounds.y - summaryBounds.height,
        ),
      ).toBeLessThanOrEqual(desktop ? 8 : 4);
      let headingSize = "28px";
      let watermarkSize = "45px";
      let summarySize = "14px";
      let roleSize = "16px";
      let dateSize = "14px";
      if (desktop) {
        headingSize = "48px";
        watermarkSize = "137px";
        summarySize = "16px";
        roleSize = "18px";
        dateSize = "16px";
      } else if (narrow) {
        headingSize = "22px";
        watermarkSize = "36px";
        summarySize = "12px";
        roleSize = "14px";
        dateSize = "12px";
      }
      if (viewport.width >= 360 && viewport.width < 390) {
        headingSize = String(26 + (viewport.width - 360) / 15);
        summarySize = String(13 + (viewport.width - 360) / 30);
      }
      expect(
        await heading.evaluate((element) =>
          parseFloat(getComputedStyle(element).fontSize),
        ),
      ).toBeCloseTo(parseFloat(headingSize), 3);
      await expect(watermark).toHaveCSS("font-size", watermarkSize);
      expect(
        await summary.evaluate((element) =>
          parseFloat(getComputedStyle(element).fontSize),
        ),
      ).toBeCloseTo(parseFloat(summarySize), 3);
      await expect(summary).toHaveCSS("white-space", "nowrap");
      let summaryHeight = 20;
      let rowHeight = 111;
      if (desktop) {
        summaryHeight = 24;
        rowHeight = 141;
      } else if (narrow) {
        summaryHeight = 18;
        rowHeight = 109;
      }
      expect(summaryBounds.height).toBe(summaryHeight);
      const rows = section.getByRole("listitem");
      const listBounds = (await section.getByRole("list").boundingBox())!;
      const areaBounds = (await heading.locator("../..").boundingBox())!;
      expect(areaBounds.height).toBe(desktop ? 140 : 80);
      expect(listBounds.y - areaBounds.y - areaBounds.height).toBe(
        desktop ? 64 : 32,
      );
      for (const row of await rows.all()) {
        const company = row.getByRole("heading", { level: 3 });
        await expect(company).toHaveCSS("font-weight", "700");
        await expect(company).toHaveCSS("font-size", desktop ? "32px" : "24px");
        const pair = row.locator("div");
        const role = pair.locator("span").first();
        const dates = pair.locator("span").last();
        await expect(role).toHaveCSS("font-size", roleSize);
        await expect(dates).toHaveCSS("font-size", dateSize);
        await expect(dates).toHaveCSS("white-space", "nowrap");
        const companyBounds = (await company.boundingBox())!;
        const roleBounds = (await role.boundingBox())!;
        const dateBounds = (await dates.boundingBox())!;
        const rowBounds = (await row.boundingBox())!;
        expect(
          roleBounds.x + roleBounds.width + (narrow ? 7 : 11),
        ).toBeLessThan(dateBounds.x);
        expect(dateBounds.x + dateBounds.width).toBeCloseTo(
          bounds.x + bounds.width,
          0,
        );
        expect(companyBounds.y - rowBounds.y).toBe(desktop ? 33 : 25);
        expect(roleBounds.y - companyBounds.y - companyBounds.height).toBe(
          desktop ? 8 : 6,
        );
        const bottomBorder = await row.evaluate((element) =>
          parseFloat(getComputedStyle(element).borderBottomWidth),
        );
        expect(rowBounds.height - bottomBorder).toBe(rowHeight);
        const baselines = await pair.locator("span").evaluateAll((elements) =>
          elements.map((element) => {
            const probe = document.createElement("i");
            probe.style.cssText =
              "display:inline-block;width:0;height:0;vertical-align:baseline";
            element.append(probe);
            const baseline = probe.getBoundingClientRect().top;
            probe.remove();
            return baseline;
          }),
        );
        expect(baselines[0]).toBeCloseTo(baselines[1], 1);
        await expect(row).toHaveCSS("border-top-width", "1px");
        const textColor =
          theme === "dark" ? "rgb(237, 242, 239)" : "rgb(2, 12, 27)";
        const mutedColor =
          theme === "dark" ? "rgb(168, 183, 202)" : "rgb(89, 98, 113)";
        await expect(company).toHaveCSS("color", textColor);
        await expect(role).toHaveCSS("color", mutedColor);
        await expect(dates).toHaveCSS("color", mutedColor);
      }
      await expect(rows.last()).toHaveCSS("border-bottom-width", "1px");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(viewport.width);
      const previous = (await page.locator("#services").boundingBox())!;
      expect(bounds.y - previous.y - previous.height).toBeCloseTo(0, 0);
      await expect(section).toHaveCSS("padding-top", desktop ? "80px" : "48px");
      await expect(section).toHaveCSS(
        "padding-bottom",
        desktop ? "80px" : "48px",
      );
      await testInfo.attach(`experience-${viewport.width}-${theme}`, {
        body: await section.screenshot({
          style:
            "header, button[aria-label='AI assistant — coming soon'] { opacity:0!important; } section[aria-labelledby='experience'] {width:100%!important;max-width:none!important;padding-inline:var(--page-gutter)!important;}",
        }),
        contentType: "image/png",
      });
    });
  }
}
