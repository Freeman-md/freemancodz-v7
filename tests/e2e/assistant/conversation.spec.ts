import { expect, test } from "@playwright/test";
import { advanceReply, openAssistant } from "./assistant.fixture";

test("ordinary presets submit exact text and immediately fail without a reply request", async ({
  page,
}) => {
  const dialog = await openAssistant(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType())) {
      requests.push(request.url());
    }
  });
  await dialog
    .getByRole("button", { name: "What has Freeman built?", exact: true })
    .click();
  await expect(
    dialog.getByRole("article", { name: "You", exact: true }),
  ).toHaveText("YouWhat has Freeman built?");
  await expect(
    dialog
      .getByRole("article", { name: "Assistant", exact: true })
      .getByText("The reply couldn’t be completed. Try again.", {
        exact: true,
      }),
  ).toBeVisible();
  await expect(
    dialog
      .getByRole("article", { name: "Assistant", exact: true })
      .getByText("Thinking…", { exact: true }),
  ).toHaveCount(0);
  await expect(dialog.getByRole("textbox")).toBeEmpty();
  expect(requests).toEqual([]);
});

test("request-time fixture gate cannot be enabled through the URL", async ({
  request,
}) => {
  for (const suffix of [
    "",
    "?scenario=stream&ASSISTANT_UI_FIXTURES=1&enabled=1",
  ]) {
    expect(
      (await request.get(`/test-fixtures/assistant${suffix}`)).status(),
    ).toBe(404);
  }
  expect(
    (
      await request.get(
        "http://localhost:3101/test-fixtures/assistant?scenario=stream",
      )
    ).status(),
  ).toBe(200);
});

test("desktop multiline, whitespace and composition semantics", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const dialog = await openAssistant(page, "stream");
  const field = dialog.getByRole("textbox");
  await field.fill("  \n ");
  await expect(
    dialog.getByRole("button", { name: "Send message" }),
  ).toBeDisabled();
  await field.fill("  First line");
  await field.press("Shift+Enter");
  await field.press("Shift+Enter");
  await field.pressSequentially("Second line  ");
  await field.dispatchEvent("compositionstart");
  await field.press("Enter");
  await expect(dialog.getByRole("article")).toHaveCount(0);
  await field.dispatchEvent("compositionend");
  const text = await field.inputValue();
  await field.press("Enter");
  await expect(
    dialog.getByRole("article", { name: "You", exact: true }).locator("p"),
  ).toHaveText(text);
  expect(
    await dialog
      .getByRole("article", { name: "You", exact: true })
      .locator("p")
      .textContent(),
  ).toBe(text);
  await expect(
    dialog
      .getByRole("article", { name: "Assistant", exact: true })
      .getByText("Thinking…", { exact: true }),
  ).toBeVisible();
  await field.fill("Next draft");
  await field.press("Enter");
  await expect(
    dialog.getByRole("article", { name: "You", exact: true }),
  ).toHaveCount(1);
  await advanceReply(page);
  await expect(
    dialog.getByRole("article", { name: "Assistant", exact: true }),
  ).toContainText("JPScents");
  await expect(
    dialog
      .getByRole("article", { name: "Assistant", exact: true })
      .getByText("Thinking…", { exact: true }),
  ).toHaveCount(0);
  await advanceReply(page, 3300);
  await expect(
    dialog.getByRole("button", { name: "Send message" }),
  ).toBeVisible();
  await expect(field).toHaveValue("Next draft");
  await expect(dialog.getByRole("status")).toHaveText("Reply complete");
});

test("mobile Return inserts a newline and Send submits", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openAssistant(page, "stream");
  const field = dialog.getByRole("textbox");
  await field.fill("First");
  await field.press("Enter");
  await field.pressSequentially("Second");
  await expect(field).toHaveValue("First\nSecond");
  await expect(dialog.getByRole("article")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Send message" }).click();
  await expect(
    dialog.getByRole("article", { name: "You", exact: true }),
  ).toHaveCount(1);
});

for (const afterChunk of [false, true]) {
  test(`Stop ${afterChunk ? "after" : "before"} first chunk retains partial text and ignores late callbacks`, async ({
    page,
  }) => {
    const dialog = await openAssistant(page, afterChunk ? "stream" : "late");
    await dialog
      .getByRole("button", { name: "What has Freeman built?", exact: true })
      .click();
    if (afterChunk) {
      await advanceReply(page);
    }
    const reply = dialog.getByRole("article", {
      name: "Assistant",
      exact: true,
    });
    const partial = (await reply.textContent())!.replace("Thinking…", "");
    await dialog.getByRole("button", { name: "Stop response" }).click();
    await expect(reply).toContainText("Response stopped");
    await advanceReply(page, 5000);
    await expect(reply).toHaveText(partial + "Response stopped");
    await expect(reply).not.toContainText("Late cancelled text");
    await expect(dialog.getByRole("status")).toHaveText("Response stopped");
  });
}

test("failure Retry replaces partial text, keeps one user and preserves a newer draft", async ({
  page,
}) => {
  const dialog = await openAssistant(page, "failure");
  await dialog
    .getByRole("button", { name: "What has Freeman built?", exact: true })
    .click();
  await advanceReply(page, 2200);
  await expect(dialog.getByRole("button", { name: "Retry" })).toHaveCount(1);
  await dialog.getByRole("textbox").fill("Keep this draft");
  await dialog.getByRole("button", { name: "Retry" }).click();
  const reply = dialog.getByRole("article", { name: "Assistant", exact: true });
  await expect(reply).not.toContainText("JPScents");
  await advanceReply(page, 2200);
  await expect(reply).toContainText("Interface Studies");
  expect((await reply.textContent())!.match(/JPScents is/g)).toHaveLength(1);
  await expect(
    dialog.getByRole("article", { name: "You", exact: true }),
  ).toHaveCount(1);
  await expect(dialog.getByRole("textbox")).toHaveValue("Keep this draft");
});

test("reply continues while the surface is closed", async ({ page }) => {
  const dialog = await openAssistant(page, "stream");
  await dialog
    .getByRole("button", { name: "What has Freeman built?", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Close assistant" }).click();
  await advanceReply(page, 5000);
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Open fixture assistant" }).click();
  await advanceReply(page, 500);
  await expect(
    dialog.getByRole("article", { name: "Assistant", exact: true }),
  ).toContainText("application-tracker automation");
  await expect(
    dialog.getByRole("button", { name: "Stop response" }),
  ).toHaveCount(0);
});

test("a cancelled late producer cannot overwrite a newer reply", async ({
  page,
}) => {
  const dialog = await openAssistant(page, "late");
  const field = dialog.getByRole("textbox");
  await field.fill("First question");
  await dialog.getByRole("button", { name: "Send message" }).click();
  await dialog.getByRole("button", { name: "Stop response" }).click();
  await field.fill("Second question");
  await dialog.getByRole("button", { name: "Send message" }).click();
  await advanceReply(page, 2200);
  await expect(dialog).not.toContainText("Late cancelled text");
  await expect(
    dialog.getByRole("article", { name: "Assistant", exact: true }).last(),
  ).toContainText("Freeman builds websites");
  await expect(
    dialog.getByRole("article", { name: "You", exact: true }),
  ).toHaveCount(2);
});
