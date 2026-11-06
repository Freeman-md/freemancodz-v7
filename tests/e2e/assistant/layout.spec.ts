import { expect, test } from "@playwright/test";
import { openAssistant } from "./assistant.fixture";

test.use({ video: "on" });

for (const [width, height, theme, scenario] of [
  [1440, 960, "dark", "empty"],
  [1440, 960, "light", "completed"],
  [820, 1180, "dark", "completed"],
  [390, 844, "light", "completed"],
  [320, 568, "dark", "long-draft"],
  [320, 568, "dark", "empty"],
  [844, 390, "dark", "completed"],
] as const) {
  test(`${width}x${height} ${theme} ${scenario} Paper layout`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(
      (value) => localStorage.setItem("freemancodz-v7-theme", value),
      theme,
    );
    await page.route("**/api/assistant", (route) =>
      route.fulfill({
        json: {
          text:
            "Freeman builds interfaces.\n\n" +
            "A readable complete answer. ".repeat(50),
        },
      }),
    );
    const dialog = await openAssistant(page);
    if (scenario !== "empty") {
      await dialog.getByRole("textbox").fill("What has Freeman built?");
      await dialog.getByRole("button", { name: "Send message" }).click();
      await expect(dialog.getByRole("status")).toHaveText("Reply complete");
    }
    if (scenario === "long-draft") {
      const field = dialog.getByRole("textbox");
      await field.fill("A long draft\n".repeat(30));
      expect(
        await field.evaluate(
          (element) => element.scrollHeight > element.clientHeight,
        ),
      ).toBe(true);
    }
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.width).toBe(width >= 1024 ? 440 : width);
    expect(bounds.height).toBe(width >= 1024 ? 640 : height);
    expect(bounds.x).toBe(width >= 1024 ? width - 464 : 0);
    expect(bounds.y).toBe(width >= 1024 ? height - 664 : 0);
    await expect(dialog).toHaveCSS(
      "background-color",
      theme === "dark" ? "rgb(7, 21, 38)" : "rgb(255, 255, 255)",
    );
    for (const name of ["Close assistant", "Send message"]) {
      const control = dialog.getByRole("button", { name });
      const box = (await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.y).toBeGreaterThanOrEqual(bounds.y);
      expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    }
    await expect(dialog.getByRole("textbox")).toHaveCSS("font-size", "16px");
    if (scenario === "empty") {
      const transcript = dialog.getByRole("region", { name: "Conversation" });
      await expect
        .poll(() => transcript.evaluate((element) => element.scrollTop))
        .toBe(0);
      const heading = (await dialog
        .getByRole("heading", { name: "What would you like to know?" })
        .boundingBox())!;
      expect(heading.y).toBeGreaterThanOrEqual(
        (await transcript.boundingBox())!.y,
      );
    } else {
      const reply = dialog
        .getByRole("article", { name: "Assistant", exact: true })
        .first();
      const author = (await reply
        .getByText("Assistant", { exact: true })
        .boundingBox())!;
      const paragraph = (await reply.locator("p").first().boundingBox())!;
      expect(paragraph.y - author.y - author.height).toBe(16);
    }
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    const close = dialog.getByRole("button", { name: "Close assistant" });
    await close.focus();
    await page.keyboard.press("ArrowRight");
    await expect(close).toBeFocused();
    await expect(close).toHaveCSS("outline-style", "solid");
    await testInfo.attach(`assistant-${width}-${theme}-${scenario}`, {
      body: await page.screenshot({
        path: testInfo.outputPath(
          `assistant-${width}-${theme}-${scenario}.png`,
        ),
      }),
      contentType: "image/png",
    });
  });
}

test("simulated VisualViewport keyboard bounds keep header and composer reachable", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, {
      width: 390,
      height: 500,
      offsetTop: 24,
      offsetLeft: 0,
    });
    Object.defineProperty(window, "visualViewport", { value: viewport });
  });
  const dialog = await openAssistant(page);
  expect((await dialog.boundingBox())!.height).toBe(500);
  expect((await dialog.boundingBox())!.y).toBe(24);
  const send = (await dialog
    .getByRole("button", { name: "Send message" })
    .boundingBox())!;
  expect(send.y + send.height).toBeLessThanOrEqual(524);
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 420, offsetTop: 0 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect.poll(async () => (await dialog.boundingBox())!.height).toBe(420);
  expect(
    (await dialog.getByRole("region", { name: "Conversation" }).boundingBox())!
      .height,
  ).toBeGreaterThan(100);
  await testInfo.attach("simulated-visual-viewport-keyboard-no-physical-ios", {
    body: await page.screenshot({
      path: testInfo.outputPath("simulated-visual-viewport-keyboard.png"),
    }),
    contentType: "image/png",
  });
});
