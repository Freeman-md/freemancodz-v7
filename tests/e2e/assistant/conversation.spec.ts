import { expect, test } from "@playwright/test";
import { openAssistant } from "./assistant.fixture";

test("preset waits for a complete answer, preserves a draft and submits follow-up history", async ({
  page,
}) => {
  const completion = Promise.withResolvers<void>();
  const bodies: unknown[] = [];
  const answer = "Freeman builds interfaces 👋\n\nHe also builds workflows.";
  await page.route("**/api/assistant", async (route) => {
    bodies.push(route.request().postDataJSON());
    await completion.promise;
    await route.fulfill({ json: { text: answer } });
  });
  const dialog = await openAssistant(page);
  const field = dialog.getByRole("textbox");
  const send = dialog.getByRole("button", { name: "Send message" });
  await dialog
    .getByRole("button", { name: "What has Freeman built?", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toHaveText("Thinking…");
  await expect(
    dialog.getByRole("article", { name: "Assistant", exact: true }),
  ).toHaveCount(0);
  await field.fill("How can he help?");
  await expect(send).toBeDisabled();
  await field.press("Enter");
  expect(bodies).toHaveLength(1);

  completion.resolve();
  await expect(
    dialog.getByRole("article", { name: "Assistant", exact: true }),
  ).toHaveText("Assistant" + answer.replace("\n\n", ""));
  await expect(dialog.getByRole("status")).toHaveText("Reply complete");
  await expect(field).toHaveValue("How can he help?");
  await send.click();
  await expect(
    dialog.getByRole("article", { name: "Assistant", exact: true }),
  ).toHaveCount(2);
  expect(bodies[1]).toEqual({
    messages: [
      { role: "user", text: "What has Freeman built?" },
      { role: "assistant", text: answer },
      { role: "user", text: "How can he help?" },
    ],
  });
});

test("desktop whitespace, multiline and composition input", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const questions: string[] = [];
  await page.route("**/api/assistant", async (route) => {
    questions.push(route.request().postDataJSON().messages.at(-1).text);
    await route.fulfill({ json: { text: "Complete reply" } });
  });
  const dialog = await openAssistant(page);
  const field = dialog.getByRole("textbox");
  await field.fill(" \n ");
  await expect(
    dialog.getByRole("button", { name: "Send message" }),
  ).toBeDisabled();
  await field.fill("  First paragraph");
  await field.press("Shift+Enter");
  await field.pressSequentially("Second line  ");
  await field.dispatchEvent("compositionstart");
  await field.press("Enter");
  expect(questions).toHaveLength(0);
  await field.dispatchEvent("compositionend");
  const text = await field.inputValue();
  await field.press("Enter");
  await expect(dialog.getByRole("status")).toHaveText("Reply complete");
  expect(questions).toEqual([text]);
});

test("mobile Return adds a line; Send submits; closing preserves the pending reply", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const completion = Promise.withResolvers<void>();
  await page.route("**/api/assistant", async (route) => {
    await completion.promise;
    await route.fulfill({ json: { text: "Completed while closed" } });
  });
  const dialog = await openAssistant(page);
  const field = dialog.getByRole("textbox");
  await field.fill("Hello");
  await field.press("Enter");
  await expect(field).toHaveValue("Hello\n");
  await expect(dialog.getByRole("article")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Send message" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Thinking…");
  await field.fill("Next draft");
  await dialog.getByRole("button", { name: "Close assistant" }).click();
  await expect(dialog).toHaveCount(0);
  completion.resolve();
  await page.getByRole("button", { name: "Open AI assistant" }).click();
  await expect(
    dialog.getByRole("article", { name: "Assistant", exact: true }),
  ).toContainText("Completed while closed");
  await expect(field).toHaveValue("Next draft");
});

for (const failure of ["http", "non-json", "invalid", "network"]) {
  test(`a ${failure} failure permits a subsequent manual submission`, async ({
    page,
  }) => {
    let calls = 0;
    await page.route("**/api/assistant", async (route) => {
      calls += 1;
      if (calls > 1) {
        await route.fulfill({ json: { text: "Recovered" } });
      } else if (failure === "http") {
        await route.fulfill({
          status: 502,
          json: { error: { code: "reply_failed", message: "Failed" } },
        });
      } else if (failure === "non-json") {
        await route.fulfill({
          status: 502,
          contentType: "text/html",
          body: "Bad gateway",
        });
      } else if (failure === "invalid") {
        await route.fulfill({ json: { text: " " } });
      } else {
        await route.abort("failed");
      }
    });
    const dialog = await openAssistant(page);
    await dialog.getByRole("textbox").fill("Hello");
    await dialog.getByRole("button", { name: "Send message" }).click();
    await expect(dialog.getByRole("status")).toHaveText(
      "The reply couldn’t be completed. Please send your message again.",
    );
    await expect(
      dialog.getByRole("button", {
        name: /^(Stop response|Retry|Latest message)$/,
      }),
    ).toHaveCount(0);
    await dialog.getByRole("textbox").fill("Hello again");
    await dialog.getByRole("button", { name: "Send message" }).click();
    await expect(dialog.getByRole("status")).toHaveText("Reply complete");
    await expect(
      dialog.getByRole("article", { name: "Assistant", exact: true }),
    ).toContainText("Recovered");
  });
}
