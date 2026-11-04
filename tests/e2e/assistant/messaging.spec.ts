import { expect, test as base } from "@playwright/test";
import {
  createAssistantTransport,
  eventBytes,
} from "../../fixtures/assistant/transport";
import { openAssistant } from "./assistant.fixture";

const test = base.extend<{
  transport: Awaited<ReturnType<typeof createAssistantTransport>>;
}>({
  transport: async ({ page }, runTest) => {
    const transport = await createAssistantTransport();
    await page.route("**/api/assistant", (route) =>
      route.continue({ url: transport.url }),
    );
    try {
      await runTest(transport);
    } finally {
      await transport.close();
    }
  },
});

test.use({ video: "on" });

for (const viewport of [
  { width: 1440, height: 960 },
  { width: 390, height: 844 },
]) {
  test(`${viewport.width}px real browser client preserves fragmented Unicode, batches text and sends follow-up history`, async ({
    page,
    transport,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const dialog = await openAssistant(page);
    await page.clock.install();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await dialog
      .getByRole("button", { name: "What has Freeman built?", exact: true })
      .click();
    const exchange = await transport.waitForRequest();
    expect(exchange.body).toEqual({
      messages: [{ role: "user", text: "What has Freeman built?" }],
    });
    exchange.start();
    const bytes = eventBytes([{ type: "delta", text: "First 👋\n\n" }]);
    const split = bytes.indexOf(0xf0) + 2;
    exchange.write(bytes.slice(0, split));
    const reply = dialog.getByRole("article", {
      name: "Assistant",
      exact: true,
    });
    await expect(reply).toContainText("Thinking…");
    exchange.write(bytes.slice(split));
    await expect(reply).toContainText("First 👋");
    const firstParagraph = await reply.locator("p").first().elementHandle();
    await dialog.getByRole("textbox").fill("My follow-up question");
    exchange.send({ type: "delta", text: "Second " });
    exchange.send({ type: "delta", text: "paragraph" });
    await expect
      .poll(async () => {
        await page.clock.runFor(100);
        return reply.textContent();
      })
      .toContain("Second paragraph");
    expect(
      await firstParagraph!.evaluate((element) => element.isConnected),
    ).toBe(true);
    await expect(dialog.getByRole("status")).toHaveText("Thinking…");
    exchange.write(
      eventBytes([
        { type: "delta", text: " — completed." },
        { type: "complete" },
        { type: "delta", text: " late forbidden text" },
      ]),
    );
    exchange.end();
    await expect(
      dialog.getByRole("button", { name: "Send message" }),
    ).toBeVisible();
    await expect(reply).toContainText("Second paragraph — completed.");
    await expect(reply).not.toContainText("forbidden");
    await expect(dialog.getByRole("textbox")).toHaveValue(
      "My follow-up question",
    );
    await testInfo.attach(`controlled-http-stream-${viewport.width}`, {
      body: await page.screenshot({
        path: testInfo.outputPath(
          `controlled-http-stream-${viewport.width}.png`,
        ),
      }),
      contentType: "image/png",
    });
    await dialog.getByRole("button", { name: "Send message" }).click();
    const followup = await transport.waitForRequest(1);
    expect(followup.body).toEqual({
      messages: [
        { role: "user", text: "What has Freeman built?" },
        {
          role: "assistant",
          text: "First 👋\n\nSecond paragraph — completed.",
        },
        { role: "user", text: "My follow-up question" },
      ],
    });
    followup.start();
    followup.send({ type: "delta", text: "Follow-up answer." });
    followup.send({ type: "complete" });
    followup.end();
    await expect(dialog.getByRole("status")).toHaveText("Reply complete");
  });
}

for (const mode of [
  "http-json",
  "http-html",
  "success-html",
  "malformed",
  "premature-end",
  "stream-error",
] as const) {
  test(`real browser transport fails safely for ${mode}`, async ({
    page,
    transport,
  }) => {
    const dialog = await openAssistant(page);
    await dialog.getByRole("textbox").fill("A question");
    await dialog.getByRole("button", { name: "Send message" }).click();
    const exchange = await transport.waitForRequest();
    const reply = dialog.getByRole("article", {
      name: "Assistant",
      exact: true,
    });
    if (mode === "http-json") {
      exchange.start(503, "application/json");
      exchange.write(
        JSON.stringify({
          error: { code: "unavailable", message: "Safe unavailable response" },
        }),
      );
    } else if (mode === "http-html" || mode === "success-html") {
      exchange.start(mode === "http-html" ? 502 : 200, "text/html");
      exchange.write("<html>Private platform failure details</html>");
    } else {
      exchange.start();
      exchange.send({ type: "delta", text: "Retained partial text." });
      await expect(reply).toContainText("Retained partial text.");
      if (mode === "malformed") {
        exchange.write('{"type":"unknown"}\n');
      }
      if (mode === "stream-error") {
        exchange.send({
          type: "error",
          error: { code: "reply_failed", message: "Safe failure" },
        });
      }
    }
    exchange.end();
    await expect(dialog.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(reply).toContainText(
      "The reply couldn’t be completed. Try again.",
    );
    await expect(dialog).not.toContainText("Private platform");
    await expect(dialog.getByRole("status")).not.toHaveText("Reply complete");
  });
}

for (const afterText of [false, true]) {
  test(`Stop ${afterText ? "after" : "before"} text aborts real HTTP and cannot update a newer turn`, async ({
    page,
    transport,
  }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    const dialog = await openAssistant(page);
    const field = dialog.getByRole("textbox");
    await field.fill("First question");
    await dialog.getByRole("button", { name: "Send message" }).click();
    const first = await transport.waitForRequest();
    first.start();
    if (afterText) {
      first.send({ type: "delta", text: "Keep this partial." });
      await expect(dialog).toContainText("Keep this partial.");
    }
    await field.fill("Next draft");
    await field.press("Enter");
    expect(transport.requests).toHaveLength(1);
    await dialog.getByRole("button", { name: "Stop response" }).click();
    await expect.poll(() => first.closed).toBe(true);
    await expect(
      dialog.getByText("Response stopped", { exact: true }).first(),
    ).toBeVisible();
    await expect(field).toHaveValue("Next draft");
    await expect(
      dialog.getByRole("article", { name: "You", exact: true }),
    ).toHaveCount(1);
    await dialog.getByRole("button", { name: "Send message" }).click();
    const next = await transport.waitForRequest(1);
    first.send({ type: "delta", text: "Cancelled late text" });
    next.start();
    next.send({ type: "delta", text: "Current response." });
    next.send({ type: "complete" });
    next.end();
    await expect(
      dialog.getByRole("article", { name: "Assistant", exact: true }).last(),
    ).toContainText("Current response.");
    await expect(dialog).not.toContainText("Cancelled late text");
    if (afterText) {
      await expect(dialog).toContainText("Keep this partial.");
    }
  });
}

test("HTTP Retry replaces the failed partial and preserves a newer draft and original user", async ({
  page,
  transport,
}) => {
  const dialog = await openAssistant(page);
  await dialog.getByRole("textbox").fill("Original question");
  await dialog.getByRole("button", { name: "Send message" }).click();
  const first = await transport.waitForRequest();
  first.start();
  first.send({ type: "delta", text: "Old partial." });
  const reply = dialog.getByRole("article", { name: "Assistant", exact: true });
  await expect(reply).toContainText("Old partial.");
  await dialog.getByRole("textbox").fill("Retain this next draft");
  first.send({
    type: "error",
    error: { code: "reply_failed", message: "Safe failure" },
  });
  first.end();
  await dialog.getByRole("button", { name: "Retry" }).click();
  const retry = await transport.waitForRequest(1);
  expect(retry.body).toEqual({
    messages: [{ role: "user", text: "Original question" }],
  });
  await expect(reply).not.toContainText("Old partial.");
  retry.start();
  retry.send({ type: "delta", text: "Replacement response." });
  retry.send({ type: "complete" });
  retry.end();
  await expect(reply).toContainText("Replacement response.");
  await expect(
    dialog.getByRole("article", { name: "You", exact: true }),
  ).toHaveCount(1);
  await expect(dialog.getByRole("textbox")).toHaveValue(
    "Retain this next draft",
  );
});

test("HTTP reply continues while closed and a too-long current question never reaches transport", async ({
  page,
  transport,
}) => {
  const dialog = await openAssistant(page);
  await dialog.getByRole("textbox").fill("While closed");
  await dialog.getByRole("button", { name: "Send message" }).click();
  const exchange = await transport.waitForRequest();
  exchange.start();
  await dialog.getByRole("button", { name: "Close assistant" }).click();
  await expect(dialog).toHaveCount(0);
  expect(exchange.closed).toBe(false);
  exchange.send({ type: "delta", text: "Finished while closed." });
  exchange.send({ type: "complete" });
  exchange.end();
  await page.getByRole("button", { name: "Open AI assistant" }).click();
  await expect(dialog).toContainText("Finished while closed.");
  await expect(
    dialog.getByRole("button", { name: "Send message" }),
  ).toBeVisible();
  await dialog.getByRole("textbox").fill("x".repeat(4001));
  await dialog.getByRole("button", { name: "Send message" }).click();
  await expect(dialog.getByRole("button", { name: "Retry" })).toBeVisible();
  expect(transport.requests).toHaveLength(1);
  expect(
    await dialog
      .getByRole("article", { name: "You", exact: true })
      .last()
      .locator("p")
      .textContent(),
  ).toHaveLength(4001);
});

test("browser deadline aborts pending transport and retains displayed partial text", async ({
  page,
  transport,
}) => {
  const dialog = await openAssistant(page);
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await dialog.getByRole("textbox").fill("A slow question");
  await dialog.getByRole("button", { name: "Send message" }).click();
  const exchange = await transport.waitForRequest();
  exchange.start();
  exchange.send({ type: "delta", text: "Keep this displayed text." });
  await expect(dialog).toContainText("Keep this displayed text.");
  await page.clock.runFor(30000);
  await expect(dialog.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect.poll(() => exchange.closed).toBe(true);
  await expect(dialog).toContainText("Keep this displayed text.");
});
