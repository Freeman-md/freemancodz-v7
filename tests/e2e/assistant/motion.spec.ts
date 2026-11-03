import { expect, test } from "@playwright/test";
import { advanceReply, openAssistant } from "./assistant.fixture";

test.use({ video: "on" });

test("recorded ordinary desktop and mobile entrances, message and dismissal", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const dialog = await openAssistant(page);
    await expect(
      dialog.getByRole("button", {
        name: "Tell me about Freeman’s experience.",
        exact: true,
      }),
    ).toHaveCSS("opacity", "1");
    await dialog
      .getByRole("button", { name: "What has Freeman built?", exact: true })
      .click();
    await expect(
      dialog.getByRole("article", { name: "You", exact: true }),
    ).toHaveCSS("opacity", "1");
    await dialog.getByRole("button", { name: "Close assistant" }).click();
    await expect(dialog).toHaveCount(0);
  }
});

test("surface alone owns exit completion and keeps background locked until dismissal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await page.clock.install();
  const trigger = page.getByRole("button", { name: "Open AI assistant" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-phase", "opening");
  const close = dialog.getByRole("button", { name: "Close assistant" });
  await expect(close).toBeFocused();
  await dialog
    .getByRole("heading", { name: "Freeman’s assistant", exact: true })
    .evaluate((element) => {
      element
        .animate([{ opacity: 1 }, { opacity: 0.5 }], { duration: 10000 })
        .pause();
    });
  await close.click();
  await expect(dialog).toHaveAttribute("data-phase", "closing");
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(trigger).toBeHidden();
  await page.keyboard.press("Escape");
  await page.clock.runFor(200);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("responsive entrance and live reduced motion settle the requested open state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.clock.install();
  await page.getByRole("button", { name: "Open AI assistant" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-phase", "opening");
  await page.setViewportSize({ width: 1440, height: 960 });
  expect((await dialog.boundingBox())!.width).toBe(440);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dialog).toHaveAttribute("data-phase", "open");
  await expect(dialog).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(dialog).toHaveAttribute("data-phase", "open");
  await expect(dialog).toHaveCSS("animation-name", "none");
  await expect(
    dialog.getByRole("button", { name: "Close assistant" }),
  ).toBeFocused();
});

test("message entrance and chunks are independent; reopening never replays existing motion", async ({
  page,
}) => {
  const dialog = await openAssistant(page, "stream");
  await dialog
    .getByRole("button", { name: "What has Freeman built?", exact: true })
    .click();
  const user = dialog.getByRole("article", { name: "You", exact: true });
  await expect(user).not.toHaveCSS("animation-name", "none");
  await advanceReply(page);
  const reply = dialog.getByRole("article", { name: "Assistant", exact: true });
  await expect(reply).toHaveCSS("animation-name", "none");
  const firstParagraph = await reply.locator("p").first().elementHandle();
  await advanceReply(page);
  expect(await firstParagraph!.evaluate((element) => element.isConnected)).toBe(
    true,
  );
  await expect(dialog.getByRole("status")).toHaveText("Thinking…");
  await dialog.getByRole("button", { name: "Close assistant" }).click();
  await advanceReply(page, 500);
  await page.getByRole("button", { name: "Open fixture assistant" }).click();
  await advanceReply(page, 500);
  await expect(user).toHaveCSS("animation-name", "none");
});

test("initial and live reduced motion settle immediately without cancelling delivery or replaying", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const dialog = await openAssistant(page, "stream");
  await expect(dialog).toHaveCSS("animation-name", "none");
  await dialog
    .getByRole("button", { name: "What has Freeman built?", exact: true })
    .click();
  await advanceReply(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(
    dialog.getByRole("article", { name: "You", exact: true }),
  ).toHaveCSS("animation-name", "none");
  await dialog.getByRole("button", { name: "Close assistant" }).click();
  await expect(dialog).toHaveAttribute("data-phase", "closing");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dialog).toHaveCount(0);
  await advanceReply(page, 4000);
  await page.getByRole("button", { name: "Open fixture assistant" }).click();
  await expect(
    dialog.getByRole("button", { name: "Stop response" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("article", { name: "Assistant", exact: true }),
  ).toContainText("application-tracker automation");
});
