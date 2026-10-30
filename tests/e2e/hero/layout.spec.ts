import { expect, test } from "@playwright/test";

test.use({ video: "on" });

for (const viewport of [
  { width: 1440, height: 960 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
  { width: 844, height: 390 },
]) {
  for (const theme of viewport.width === 1440 || viewport.width === 390
    ? ["dark", "light"]
    : ["dark"]) {
    test(`${viewport.width}x${viewport.height} ${theme} composition, crop, contrast and fixed assistant`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(
        (value) => localStorage.setItem("freemancodz-v7-theme", value),
        theme,
      );
      await page.goto("/");
      const hero = page.getByRole("region", {
        name: "From first click. To a job well done.",
      });
      const image = page.getByRole("img", { name: /Freeman in profile/ });
      await expect(image.locator("../..")).toHaveCSS("opacity", "1");
      await expect(
        page.getByText("Freeman Madudili").locator("../.."),
      ).toHaveCSS("opacity", "1");
      await expect
        .poll(() =>
          image.evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const dimensions = await image.boundingBox();
      const heroBounds = (await hero.boundingBox())!;
      const action = (await page
        .getByRole("link", { name: "Explore my work" })
        .boundingBox())!;
      expect(dimensions!.width / dimensions!.height).toBeCloseTo(
        1145 / 1374,
        3,
      );
      expect(dimensions!.y).toBeGreaterThanOrEqual(action.y + action.height);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(viewport.width);
      expect(heroBounds.y).toBe(0);
      expect(heroBounds.height).toBeGreaterThanOrEqual(viewport.height);
      expect(action.height).toBe(52);
      if (viewport.width === 1440) {
        expect(heroBounds.height).toBe(960);
        expect(
          (await page.getByRole("heading", { level: 1 }).boundingBox())!.y,
        ).toBeCloseTo(228, 0);
        expect(action.y).toBeCloseTo(496, 0);
        expect(dimensions!.width).toBeCloseTo(377.778, 0);
        expect(
          dimensions!.y + dimensions!.height - heroBounds.height,
        ).toBeCloseTo(100, 0);
        const labels = (await page
          .getByText("Freeman Madudili")
          .locator("../..")
          .boundingBox())!;
        expect(heroBounds.height - labels.y - labels.height).toBe(16);
      }
      if (viewport.width === 390) {
        expect(heroBounds.height).toBe(844);
        expect(
          (await page.getByRole("heading", { level: 1 }).boundingBox())!.y,
        ).toBeCloseTo(174, 0);
        expect(action.y).toBeCloseTo(404, 0);
        expect(dimensions!.width).toBeCloseTo(314.444, 0);
        expect(dimensions!.y + dimensions!.height).toBeCloseTo(844, 0);
        const signoff = (await page
          .getByText("Connected to what happens next")
          .boundingBox())!;
        expect(signoff.x + signoff.width).toBe(366);
        const assistant = (await page
          .getByRole("button", { name: /AI assistant/ })
          .boundingBox())!;
        expect(assistant.x).toBeLessThan(signoff.x + signoff.width);
        expect(assistant.y).toBeLessThan(signoff.y + signoff.height);
      }
      const contrast = await page
        .getByRole("link", { name: "Explore my work" })
        .evaluate((element) => {
          const style = getComputedStyle(element);
          function luminance(colour: string) {
            const channels = colour
              .match(/\d+/g)!
              .slice(0, 3)
              .map(Number)
              .map((value) => {
                const channel = value / 255;
                return channel <= 0.04045
                  ? channel / 12.92
                  : ((channel + 0.055) / 1.055) ** 2.4;
              });
            return (
              channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
            );
          }
          const foreground = luminance(style.color);
          const background = luminance(style.backgroundColor);
          return {
            ratio:
              (Math.max(foreground, background) + 0.05) /
              (Math.min(foreground, background) + 0.05),
            foreground: style.color,
          };
        });
      expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
      expect(contrast.foreground).toBe(
        theme === "dark" ? "rgb(2, 12, 27)" : "rgb(255, 255, 255)",
      );
      const assistant = page.getByRole("button", { name: /AI assistant/ });
      const assistantBounds = (await assistant.boundingBox())!;
      const size = viewport.width >= 1024 ? 52 : 48;
      expect(assistantBounds.width).toBe(size);
      expect(assistantBounds.height).toBe(size);
      expect(viewport.width - assistantBounds.x - size).toBe(
        viewport.width >= 1024 ? 24 : 16,
      );
      expect(viewport.height - assistantBounds.y - size).toBe(
        viewport.width >= 1024 ? 24 : 20,
      );
      await expect(assistant).toHaveCSS("color", contrast.foreground);
      await testInfo.attach(`hero-${viewport.width}-${theme}`, {
        body: await hero.screenshot(),
        contentType: "image/png",
      });
      await page.evaluate(() => scrollTo(0, 120));
      await expect.poll(() => assistant.boundingBox()).toEqual(assistantBounds);
      if (viewport.width < 1024) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        expect(
          await page
            .locator("button[aria-label='AI assistant — coming soon']")
            .count(),
        ).toBe(1);
        expect(
          await dialog
            .locator("button[aria-label='AI assistant — coming soon']")
            .count(),
        ).toBe(0);
        await expect
          .poll(() =>
            page.evaluate(
              ({ x, y }) =>
                document.elementFromPoint(x, y)?.closest('[role="dialog"]') !==
                null,
              {
                x: assistantBounds.x + size / 2,
                y: assistantBounds.y + size / 2,
              },
            ),
          )
          .toBe(true);
        await testInfo.attach("navigation-above-assistant", {
          body: await page.screenshot(),
          contentType: "image/png",
        });
      }
    });
  }
}
