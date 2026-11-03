import { expect, type Page } from "@playwright/test";

export async function openAssistant(page: Page, scenario?: string) {
  if (scenario) {
    await page.goto(
      `http://localhost:3101/test-fixtures/assistant?scenario=${scenario}`,
    );
    await page.clock.install();
    const trigger = page.getByRole("button", {
      name: "Open fixture assistant",
    });
    const id = await trigger.getAttribute("aria-controls");
    await trigger.click();
    const dialog = page.locator(`[id="${id}"]`);
    await expect(dialog).toBeVisible();
    await page.clock.runFor(500);
    await expect(dialog).toHaveAttribute("data-phase", "open");
    return dialog;
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Open AI assistant" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-phase", "open");
  return dialog;
}

export async function advanceReply(page: Page, milliseconds = 1100) {
  await page.clock.runFor(milliseconds);
}

// Hold real CSS animations so lifecycle assertions do not race short product durations.
export async function holdSurfaceMotion(page: Page) {
  return page.addStyleTag({
    content:
      '[role="dialog"][data-phase="opening"], [role="dialog"][data-phase="closing"] { animation-play-state: paused !important; }',
  });
}
