import { expect, test } from "@playwright/test";
import {
  installBackdropPattern,
  removeBackdropSupport,
} from "./backdrop.fixture";

for (const width of [390, 1440]) {
  for (const theme of ["dark", "light"]) {
    test(`real scrolling content is blurred at ${width}px in ${theme}, with opaque fallback`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(
        (preference) =>
          localStorage.setItem("freemancodz-v7-theme", preference),
        theme,
      );
      await page.goto("/");
      await expect(
        page.getByRole("button", {
          name:
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        }),
      ).toBeEnabled();
      const cleanupPattern = await installBackdropPattern(page);
      const header = page
        .locator("[data-site-header]")
        .filter({ visible: true });
      const originalBounds = (await header.boundingBox())!;
      await page.evaluate(() => window.scrollTo(0, 400));
      expect(await header.boundingBox()).toEqual(originalBounds);
      const styles = await header.evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        filter: getComputedStyle(element).backdropFilter,
      }));
      expect(styles.filter).toBe("blur(16px)");
      expect(styles.background).toMatch(/0\.9|90%/);
      const filtered = await header.screenshot();
      await testInfo.attach("filtered", {
        body: filtered,
        contentType: "image/png",
      });
      const noFilter = await page.addStyleTag({
        content:
          "[data-site-header] { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }",
      });
      const unfiltered = await header.screenshot();
      await testInfo.attach("unfiltered-comparison", {
        body: unfiltered,
        contentType: "image/png",
      });
      await noFilter.evaluate((element) =>
        element.parentNode?.removeChild(element),
      );

      const restoreSupport = await removeBackdropSupport(page);
      await expect(header).toHaveCSS(
        "background-color",
        theme === "dark" ? "rgb(10, 25, 47)" : "rgb(255, 255, 255)",
      );
      await expect(header).toHaveCSS("backdrop-filter", "none");
      await testInfo.attach("opaque-fallback", {
        body: await header.screenshot(),
        contentType: "image/png",
      });
      await restoreSupport();
      await cleanupPattern();
      expect(filtered.equals(unfiltered)).toBe(false);
    });
  }
}
