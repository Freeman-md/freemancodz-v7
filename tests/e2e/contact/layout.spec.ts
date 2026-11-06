import { expect, test } from "@playwright/test";

test.use({ video: "on" });

for (const viewport of [
  { width: 1440, height: 960 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
  { width: 320, height: 844 },
]) {
  for (const theme of viewport.width === 1440 || viewport.width === 390
    ? ["dark", "light"]
    : ["dark"]) {
    test(`${viewport.width}px ${theme} Contact matches the hierarchy, natural social rows and assistant clearance`, async ({
      page,
      browserName,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(
        (value) => localStorage.setItem("freemancodz-v7-theme", value),
        theme,
      );
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const section = page.getByRole("region", {
        name: "HAVE A PROJECT IN MIND?",
        exact: true,
      });
      await section.getByRole("heading").focus();
      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      const desktop = viewport.width >= 1024;
      const bounds = (await section.boundingBox())!;
      expect(bounds.x).toBe(desktop ? 80 : 24);
      expect(bounds.width).toBe(viewport.width - bounds.x * 2);
      const heading = section.getByRole("heading");
      const mobileHeadingSize = viewport.width < 360 ? "28px" : "32px";
      const mobileHeadingLineHeight = viewport.width < 360 ? "36px" : "40px";
      await expect(heading).toHaveCSS(
        "font-size",
        desktop ? "64px" : mobileHeadingSize,
      );
      await expect(heading).toHaveCSS(
        "line-height",
        desktop ? "72px" : mobileHeadingLineHeight,
      );
      const headingBounds = (await heading.boundingBox())!;
      expect(headingBounds.x + headingBounds.width / 2).toBeCloseTo(
        viewport.width / 2,
        0,
      );
      const availability = (await section
        .getByText("Available for new projects")
        .boundingBox())!;
      expect(availability.height).toBe(32);
      expect(headingBounds.y - availability.y - availability.height).toBe(28);
      const copy = section.locator('[data-contact-part="copy"]');
      await expect(copy).toHaveCSS("font-size", desktop ? "17px" : "16px");
      await expect(copy).toHaveCSS("line-height", desktop ? "28px" : "26px");
      const copyBounds = (await copy.boundingBox())!;
      expect(copyBounds.width).toBeLessThanOrEqual(600);
      expect(copyBounds.y - headingBounds.y - headingBounds.height).toBe(16);
      const action = section.getByRole("link", {
        name: "Contact Me",
        exact: true,
      });
      const actionBounds = (await action.boundingBox())!;
      expect(actionBounds.height).toBe(52);
      expect(actionBounds.y - copyBounds.y - copyBounds.height).toBe(28);
      await expect(action).toHaveCSS("gap", "10px");
      await expect(action).toHaveCSS("padding-left", "24px");
      await expect(action.locator("svg")).toHaveAttribute("width", "16");
      await expect(action.locator("svg")).toHaveAttribute("stroke-width", "2");
      const links = section.locator('[data-contact-part="social"]');
      const boxes = await links.evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        }),
      );
      expect(boxes.every((box) => box.height === 48)).toBe(true);
      expect(boxes[0].y - actionBounds.y - actionBounds.height).toBe(
        desktop ? 96 : 64,
      );
      expect(boxes[0].y).toBe(boxes[1].y);
      expect(boxes[2].y).toBe(boxes[3].y);
      expect(boxes[2].y - boxes[0].y).toBe(desktop ? 0 : 60);
      for (const pair of desktop
        ? [
            [0, 1],
            [1, 2],
            [2, 3],
          ]
        : [
            [0, 1],
            [2, 3],
          ]) {
        expect(
          boxes[pair[1]].x - boxes[pair[0]].x - boxes[pair[0]].width,
        ).toBeCloseTo(desktop ? 16 : 12, 0);
      }
      expect(boxes[0].width).toBeGreaterThan(boxes[2].width);
      expect(boxes[3].width).toBeGreaterThan(boxes[2].width);
      const profile = section.getByRole("link", {
        name: "Freemancodz on Contra",
      });
      await expect(profile).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(profile).toHaveCSS("color", "rgb(2, 12, 27)");
      const avatar = profile.locator("img");
      await expect(avatar).toHaveCSS("width", "36px");
      await expect(avatar).toHaveCSS("height", "36px");
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
      const lastBottom = Math.max(...boxes.map((box) => box.y + box.height));
      expect(bounds.y + bounds.height - lastBottom).toBe(112);
      const assistant = (await page
        .getByRole("button", { name: "Open AI assistant" })
        .boundingBox())!;
      expect(lastBottom + 6).toBeLessThan(assistant.y);
      expect(bounds.height).toBeLessThan(viewport.height);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(viewport.width);
      await heading.focus();
      for (const link of await section.getByRole("link").all()) {
        await page.keyboard.press(
          browserName === "webkit" && process.platform === "darwin"
            ? "Alt+Tab"
            : "Tab",
        );
        await expect(link).toBeFocused();
        await expect(link).toHaveCSS("outline-style", "solid");
        const rect = (await link.boundingBox())!;
        expect(rect.x - 6).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width + 6).toBeLessThanOrEqual(viewport.width);
        expect(rect.y + rect.height + 6).toBeLessThan(viewport.height);
      }
      await testInfo.attach(`contact-${viewport.width}-${theme}-settled`, {
        body: await section.screenshot({
          style: "header {opacity:0!important}",
        }),
        contentType: "image/png",
      });
    });
  }
}

test("Contact hover uses fill/border without displacement and Hero keeps its established defaults", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "HAVE A PROJECT IN MIND?",
    exact: true,
  });
  await section.getByRole("heading").focus();
  const action = section.getByRole("link", { name: "Contact Me", exact: true });
  const profile = section.getByRole("link", { name: "Freemancodz on Contra" });
  for (const theme of ["dark", "light"]) {
    if (theme === "light") {
      await page
        .getByRole("button", { name: "Switch to light theme" })
        .filter({ visible: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    }
    const accent = theme === "dark" ? "rgb(100, 255, 218)" : "rgb(8, 125, 105)";
    await action.hover();
    await expect(action).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await expect(action).toHaveCSS("border-top-color", accent);
    const contrast = await action.evaluate((element) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      function luminance(color: string) {
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const channels = Array.from(context.getImageData(0, 0, 1, 1).data)
          .slice(0, 3)
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
      const style = getComputedStyle(element);
      const values = [
        luminance(style.color),
        luminance(style.backgroundColor),
      ].sort((first, second) => first - second);
      return (values[1] + 0.05) / (values[0] + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await profile.hover();
    await expect(profile).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(profile).toHaveCSS("border-top-color", accent);
  }
  const heroAction = page.getByRole("link", {
    name: "Explore my work",
    exact: true,
  });
  await heroAction.hover();
  await expect(heroAction).toHaveCSS("gap", "6px");
  await expect(heroAction).toHaveCSS("padding-left", "28px");
  await expect(heroAction).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -2)");
  await expect(heroAction.locator("svg")).toHaveAttribute(
    "stroke-width",
    "1.75",
  );
});

for (const width of [1440, 390]) {
  test(`shared section gaps are counted once at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const gap = width >= 1024 ? 160 : 96;
    const sections = page.locator("main section");
    const metrics = await sections.evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          name: element.getAttribute("aria-labelledby") ?? element.id,
          top: parseFloat(style.paddingTop),
          bottom: parseFloat(style.paddingBottom),
        };
      }),
    );
    const services = metrics.find(
      (section) => section.name === "services-title",
    )!;
    const experience = metrics.find(
      (section) => section.name === "experience",
    )!;
    const testimonials = metrics.find(
      (section) => section.name === "testimonials",
    )!;
    const contact = metrics.find((section) => section.name === "contact")!;
    for (const section of [services, experience, testimonials]) {
      expect(section.top).toBe(gap / 2);
      expect(section.bottom).toBe(gap / 2);
    }
    expect(services.bottom + experience.top).toBe(gap);
    expect(experience.bottom + testimonials.top).toBe(gap);
    expect(testimonials.bottom + contact.top).toBe(gap);
    expect(contact.bottom).toBe(112);
    await page.locator("#services").scrollIntoViewIfNeeded();
    await testInfo.attach(`section-spacing-${width}`, {
      body: await page.screenshot({
        path: testInfo.outputPath(`section-spacing-${width}.png`),
        fullPage: true,
      }),
      contentType: "image/png",
    });
  });
}
