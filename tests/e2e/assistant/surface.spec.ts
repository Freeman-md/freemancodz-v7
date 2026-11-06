import { expect, test } from "@playwright/test";
import { completedReply } from "./stream.fixture";
import { openAssistant } from "./assistant.fixture";

for (const route of ["/", "/work"]) {
  test(`root launcher and modal lifecycle on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(route);
    const trigger = page.getByRole("button", { name: "Open AI assistant" });
    await expect(trigger).toHaveCount(1);
    await expect(trigger).toBeEnabled();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAccessibleName("Freeman’s assistant");
    await expect(
      dialog.getByRole("button", { name: "Close assistant" }),
    ).toBeFocused();
    await expect(trigger).toBeHidden();
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await page.mouse.click(20, 400);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox").focus();
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("button", { name: "Close assistant" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });
}

test("visit state survives close, responsive changes, theme and client navigation; reload clears", async ({
  page,
}) => {
  await page.route("**/api/assistant", (route) =>
    route.fulfill(completedReply("A complete answer")),
  );
  const dialog = await openAssistant(page);
  await dialog
    .getByRole("button", { name: "What has Freeman built?", exact: true })
    .click();
  await dialog.getByRole("textbox").fill("My next question");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox")).toHaveValue("My next question");
  await page.setViewportSize({ width: 1440, height: 960 });
  await dialog.getByRole("button", { name: "Close assistant" }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", { name: /Switch to light theme/ })
    .filter({ visible: true })
    .click();
  await page.getByRole("link", { name: /View all work/i }).click();
  await expect(page).toHaveURL(/\/work$/);
  await page.getByRole("button", { name: "Open AI assistant" }).click();
  await expect(dialog.getByRole("textbox")).toHaveValue("My next question");
  await expect(
    dialog.getByRole("article", { name: "You", exact: true }),
  ).toHaveText(/What has Freeman built/);
  await page.reload();
  await page.getByRole("button", { name: "Open AI assistant" }).click();
  await expect(dialog.getByRole("textbox")).toBeEmpty();
  await expect(
    dialog.getByRole("heading", { name: "What would you like to know?" }),
  ).toBeVisible();
});

test("reduced motion opens and dismisses accessibly", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const dialog = await openAssistant(page);
  await expect(dialog).toHaveCSS("animation-name", "none");
  await expect(
    dialog.getByRole("button", { name: "Close assistant" }),
  ).toBeFocused();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(dialog).toHaveAttribute("data-phase", "open");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open AI assistant" }),
  ).toBeFocused();
});
