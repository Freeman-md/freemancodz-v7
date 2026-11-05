import { expect, type Page } from "@playwright/test";

export async function openAssistant(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open AI assistant" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-phase", "open");
  return dialog;
}
