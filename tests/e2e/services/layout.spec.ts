import { expect, test } from "@playwright/test";

test.use({ video: "on" });
for (const viewport of [
  { width: 1440, height: 960 },
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 320, height: 844 },
]) {
  for (const theme of viewport.width === 1440 || viewport.width === 390
    ? ["dark", "light"]
    : ["dark"]) {
    test(`${viewport.width}px ${theme} Services geometry, natural panels and preview clearance`, async ({
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
        name: "/ SERVICES",
        exact: true,
      });
      const heading = section.getByRole("heading", {
        level: 2,
        name: "/ SERVICES",
      });
      const web = section.getByRole("button", {
        name: "WEB DEVELOPMENT",
        exact: true,
      });
      const automation = section.getByRole("button", {
        name: "AUTOMATION",
        exact: true,
      });
      await web.scrollIntoViewIfNeeded();
      await expect(web).toBeEnabled();
      const bounds = (await section.boundingBox())!;
      const titleBounds = (await heading.boundingBox())!;
      const watermark = (await section
        .locator('[data-section-part="watermark"]')
        .boundingBox())!;
      expect(bounds.x).toBe(viewport.width >= 1024 ? 80 : 24);
      expect(titleBounds.x).toBe(bounds.x);
      expect(watermark.x).toBe(bounds.x);
      expect(
        Math.abs(
          titleBounds.y + titleBounds.height - watermark.y - watermark.height,
        ),
      ).toBeLessThanOrEqual(6);
      let headingSize = "28px";
      let serviceTitleSize = "28px";
      if (viewport.width >= 1024) {
        headingSize = "48px";
        serviceTitleSize = "48px";
      } else if (viewport.width === 320) {
        headingSize = "22px";
        serviceTitleSize = "24px";
      }
      await expect(heading).toHaveCSS("font-size", headingSize);
      await expect(web).toHaveCSS("font-size", serviceTitleSize);
      const activeColor =
        theme === "dark" ? "rgb(237, 242, 239)" : "rgb(2, 12, 27)";
      const inactiveColor =
        theme === "dark" ? "rgb(168, 183, 202)" : "rgb(89, 98, 113)";
      const heights: number[] = [];
      for (const state of ["web", "automation", "closed"]) {
        if (state === "automation") {
          await automation.focus();
          await page.keyboard.press("Enter");
        }
        if (state === "closed") {
          await page.keyboard.press("Enter");
        }
        const active = state === "web" ? web : automation;
        const article = active.locator("../..");
        heights.push((await section.boundingBox())!.height);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(viewport.width);
        if (state !== "closed") {
          const panel = section.getByRole("region", {
            name: state === "web" ? "WEB DEVELOPMENT" : "AUTOMATION",
            exact: true,
          });
          const preview = panel.getByRole("img");
          if (state === "web") {
            await expect
              .poll(() =>
                preview.evaluate(
                  (element: HTMLImageElement) =>
                    element.complete && element.naturalWidth > 0,
                ),
              )
              .toBe(true);
          }
          const previewBounds = (await preview.boundingBox())!;
          const articleBounds = (await article.boundingBox())!;
          const caption = panel.getByText(
            state === "web"
              ? "JPScents · a real fragrance storefront"
              : "Email PA · illustrated workflow with example data",
          );
          const captionBounds = (await caption.boundingBox())!;
          expect(previewBounds.x).toBeGreaterThanOrEqual(bounds.x);
          expect(previewBounds.x + previewBounds.width).toBeLessThanOrEqual(
            bounds.x + bounds.width,
          );
          const originalWidth = await preview.evaluate((element) =>
            parseFloat(getComputedStyle(element).width),
          );
          expect(originalWidth).toBe(viewport.width >= 768 ? 280 : 136);
          if (state === "web" && viewport.width <= 390) {
            const wrapping = await web
              .locator("span")
              .first()
              .evaluate((element) => {
                const range = document.createRange();
                range.setStart(element.firstChild!, 4);
                range.setEnd(element.firstChild!, 15);
                return {
                  wordLines: range.getClientRects().length,
                  height: element.getBoundingClientRect().height,
                  lineHeight: parseFloat(getComputedStyle(element).lineHeight),
                };
              });
            expect(wrapping.wordLines).toBe(1);
            expect(wrapping.height).toBe(wrapping.lineHeight * 2);
          }
          const rotation = await preview.evaluate((element) => {
            const matrix = new DOMMatrixReadOnly(
              getComputedStyle(element).transform,
            );
            return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
          });
          expect(rotation).toBeCloseTo(state === "web" ? 3 : -3, 0);
          if (viewport.width >= 768) {
            expect(previewBounds.y).toBeLessThan(articleBounds.y - 25);
            expect(captionBounds.x + captionBounds.width).toBeLessThan(
              previewBounds.x,
            );
            const buttonBounds = (await active.boundingBox())!;
            expect(previewBounds.x + previewBounds.width).toBeLessThan(
              buttonBounds.x + buttonBounds.width - 44,
            );
          } else {
            expect(previewBounds.y + previewBounds.height).toBeGreaterThan(
              articleBounds.y + articleBounds.height + 10,
            );
            expect(captionBounds.y + captionBounds.height).toBeLessThan(
              previewBounds.y,
            );
            if (state === "web") {
              const nextHeader = (await automation.boundingBox())!;
              expect(previewBounds.y + previewBounds.height).toBeLessThan(
                nextHeader.y,
              );
            }
          }
          expect(
            await preview.evaluate(
              (element) =>
                getComputedStyle(element.parentElement!).pointerEvents,
            ),
          ).toBe("none");
        } else {
          await expect(section.getByRole("region")).toHaveCount(0);
        }
        await expect(web).toHaveCSS(
          "color",
          state === "web" ? activeColor : inactiveColor,
        );
        await testInfo.attach(`services-${viewport.width}-${theme}-${state}`, {
          body: await section.screenshot({
            style:
              "header, button[aria-label='AI assistant — coming soon'] { opacity: 0 !important; } section[aria-labelledby='services-title'] { width:100% !important; max-width:none !important; padding-inline:var(--page-gutter) !important; }",
          }),
          contentType: "image/png",
        });
      }
      expect(heights[2]).toBeLessThan(heights[0]);
      expect(heights[2]).toBeLessThan(heights[1]);
    });
  }
}
