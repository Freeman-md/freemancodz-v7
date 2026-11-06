import { expect, test, completedReply } from "./stream.fixture";
import { openAssistant } from "./assistant.fixture";

test.use({ video: "on" });

test("preset text arrives before completion, preserves drafting and sends completed follow-up history", async ({
  page,
  stream,
}, testInfo) => {
  const dialog = await openAssistant(page);
  const field = dialog.getByRole("textbox");
  const send = dialog.getByRole("button", { name: "Send message" });
  await dialog
    .getByRole("button", { name: "What has Freeman built?", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toHaveText("Thinking…");
  await expect.poll(() => stream.requests.length).toBe(1);
  stream.send(0, { type: "delta", text: "Freeman builds interfaces 👋" });
  const reply = dialog.getByRole("article", { name: "Assistant", exact: true });
  await expect(reply).toContainText("Freeman builds interfaces 👋");
  await expect(send).toBeDisabled();
  await testInfo.attach("incremental-text-before-completion", {
    body: await page.screenshot({
      path: testInfo.outputPath("incremental-text.png"),
    }),
    contentType: "image/png",
  });
  await expect(
    dialog
      .getByRole("region", { name: "Conversation" })
      .getByText("Thinking…", { exact: true }),
  ).toHaveCount(0);
  await expect(dialog.getByRole("group", { name: "Sources" })).toHaveCount(0);
  await field.fill("How can he help?");
  await field.press("Enter");
  expect(stream.requests).toHaveLength(1);
  stream.send(0, { type: "delta", text: "\n\nHe also builds workflows." });
  await expect(reply.locator("p")).toHaveCount(2);
  stream.send(0, {
    type: "complete",
    sources: [
      {
        id: "services",
        title: "Services",
        url: "https://freemancodz-v7.vercel.app/#services",
      },
    ],
  });
  stream.end(0);
  await expect(dialog.getByRole("status")).toHaveText("Reply complete");
  await expect(
    dialog.getByRole("link", { name: "Services", exact: true }),
  ).toBeVisible();
  await expect(field).toHaveValue("How can he help?");
  await send.click();
  await expect.poll(() => stream.requests.length).toBe(2);
  expect(stream.requests[1].messages).toEqual([
    { role: "user", text: "What has Freeman built?" },
    {
      role: "assistant",
      text: "Freeman builds interfaces 👋\n\nHe also builds workflows.",
    },
    { role: "user", text: "How can he help?" },
  ]);
  stream.send(1, { type: "delta", text: "Follow-up answer" });
  stream.send(1, { type: "complete", sources: [] });
  stream.end(1);
  await expect(reply).toHaveCount(2);
});

test("desktop whitespace, multiline and composition input", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const questions: string[] = [];
  await page.route("**/api/assistant", async (route) => {
    questions.push(route.request().postDataJSON().messages.at(-1).text);
    await route.fulfill(completedReply("Complete reply"));
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
    await route.fulfill(completedReply("Completed while closed"));
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
        await route.fulfill(completedReply("Recovered"));
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

for (const terminal of ["error", "eof"] as const) {
  test(`partial ${terminal} retains visible text but excludes it from the next manual request`, async ({
    page,
    stream,
  }) => {
    const dialog = await openAssistant(page);
    await dialog.getByRole("textbox").fill("First question");
    await dialog.getByRole("button", { name: "Send message" }).click();
    await expect.poll(() => stream.requests.length).toBe(1);
    stream.send(0, { type: "delta", text: "Unfinished partial answer" });
    await expect(
      dialog.getByRole("article", { name: "Assistant", exact: true }),
    ).toContainText("Unfinished partial answer");
    if (terminal === "error") {
      stream.send(0, {
        type: "error",
        error: { code: "reply_failed", message: "Failed" },
      });
    }
    stream.end(0);
    await expect(dialog.getByRole("status")).toContainText(
      "couldn’t be completed",
    );
    await expect(
      dialog.getByRole("article", { name: "Assistant", exact: true }),
    ).toContainText("Unfinished partial answer");
    await expect(dialog.getByRole("group", { name: "Sources" })).toHaveCount(0);
    await dialog.getByRole("textbox").fill("New question");
    await dialog.getByRole("button", { name: "Send message" }).click();
    await expect.poll(() => stream.requests.length).toBe(2);
    await expect(
      dialog.getByRole("article", { name: "Assistant", exact: true }),
    ).toHaveCount(0);
    expect(stream.requests[1].messages).toEqual([
      { role: "user", text: "First question" },
      { role: "user", text: "New question" },
    ]);
  });
}

test("closing keeps a stream active; page teardown cancels it", async ({
  page,
  stream,
}) => {
  const dialog = await openAssistant(page);
  await dialog.getByRole("textbox").fill("Hello");
  await dialog.getByRole("button", { name: "Send message" }).click();
  await expect.poll(() => stream.requests.length).toBe(1);
  stream.send(0, { type: "delta", text: "First" });
  await expect(
    dialog.getByRole("article", { name: "Assistant", exact: true }),
  ).toContainText("First");
  await dialog.getByRole("button", { name: "Close assistant" }).click();
  await expect(dialog).toHaveCount(0);
  expect(stream.requests[0].closed).toBe(false);
  stream.send(0, { type: "delta", text: " while closed" });
  await page.getByRole("button", { name: "Open AI assistant" }).click();
  await expect(
    dialog.getByRole("article", { name: "Assistant", exact: true }),
  ).toContainText("First while closed");
  await page.goto("about:blank");
  await expect.poll(() => stream.requests[0].closed).toBe(true);
});
