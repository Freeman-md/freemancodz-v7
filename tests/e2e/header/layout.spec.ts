import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 1440, height: 960 },
  { width: 844, height: 390 },
];

function contrast(foreground: string, background: string) {
  function luminance(color: string) {
    const channels = color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => a - b,
  );
  return (values[1] + 0.05) / (values[0] + 0.05);
}

for (const viewport of viewports) {
  for (const theme of ["dark", "light"]) {
    test(`${viewport.width} × ${viewport.height} ${theme}: geometry, focus, contrast and menu fit`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(
        (preference) =>
          localStorage.setItem("freemancodz-v7-theme", preference),
        theme,
      );
      await page.goto("/");
      const desktop = viewport.width >= 1024;
      const landscape = viewport.height < 480;
      const header = page
        .locator(`[data-site-header="${desktop ? "desktop" : "mobile"}"]`)
        .filter({ visible: true });
      const bounds = (await header.boundingBox())!;
      let side = 12;
      if (desktop) {
        side = 80;
      } else if (landscape) {
        side = 44;
      }
      expect(bounds).toEqual({
        x: side,
        y: landscape ? 24 : 16,
        width: viewport.width - side * 2,
        height: desktop ? 64 : 58,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      for (const button of await header.getByRole("button").all()) {
        const target = (await button.boundingBox())!;
        expect(target.width).toBeGreaterThanOrEqual(44);
        expect(target.height).toBeGreaterThanOrEqual(44);
        await button.focus();
        await expect(button).toHaveCSS("outline-style", "solid");
        expect(target.x - 6).toBeGreaterThanOrEqual(0);
        expect(target.x + target.width + 6).toBeLessThanOrEqual(viewport.width);
      }
      const colors = await header.evaluate((element) => {
        const style = getComputedStyle(element);
        const sample = document.createElement("span");
        element.appendChild(sample);
        const result = [
          "--color-surface",
          "--color-text-display",
          "--color-text-muted",
          "--color-accent",
        ].map((token) => {
          sample.style.color = style.getPropertyValue(token);
          return getComputedStyle(sample).color;
        });
        sample.remove();
        return result;
      });
      for (const foreground of colors.slice(1)) {
        expect(contrast(foreground, colors[0])).toBeGreaterThanOrEqual(4.5);
      }
      await testInfo.attach(`header-${viewport.width}-${theme}`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
      await page.evaluate(() => window.scrollTo(0, 300));
      expect(await header.boundingBox()).toEqual(bounds);

      if (!desktop) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("navigation")).not.toHaveAttribute(
          "inert",
        );
        expect(
          await dialog
            .getByRole("button", { name: "Close navigation" })
            .boundingBox(),
        ).toEqual(
          await page
            .getByRole("button", {
              name: "Open navigation",
              includeHidden: true,
            })
            .boundingBox(),
        );
        const contact = dialog.getByRole("link", { name: "Let’s talk" });
        await contact.scrollIntoViewIfNeeded();
        const linkBounds = (await contact.boundingBox())!;
        expect(linkBounds.y).toBeGreaterThanOrEqual(90);
        expect(linkBounds.y + linkBounds.height).toBeLessThanOrEqual(
          viewport.height,
        );
        await testInfo.attach(`menu-${viewport.width}-${theme}`, {
          body: await page.screenshot(),
          contentType: "image/png",
        });
        expect(await page.evaluate(() => window.scrollY)).toBe(300);
      }
    });
  }
}

test("very short menu scrolls within the dialog and leaves background still", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 260 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("navigation")).not.toHaveAttribute("inert");
  const contact = dialog.getByRole("link", { name: "Let’s talk" });
  await contact.scrollIntoViewIfNeeded();
  expect(
    (await contact.boundingBox())!.y + (await contact.boundingBox())!.height,
  ).toBeLessThanOrEqual(260);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
});
