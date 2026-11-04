import { expect, test } from "@playwright/test";
import { OpenAIClient } from "@/infrastructure/openai/client";
import { assistantErrors } from "@/modules/assistant/schemas";
import {
  providerComplete,
  providerDelta,
  providerResponse,
} from "../../fixtures/assistant/transport";

const input = {
  instructions: "Approved facts only.",
  messages: [{ role: "user" as const, text: "Hello 👋\n\nSecond paragraph" }],
};

test("real SDK request uses pinned settings and translates text only after confirmed completion", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, options) => {
    calls += 1;
    expect(String(url)).toBe("https://api.openai.com/v1/responses");
    expect(JSON.parse(String(options?.body))).toEqual({
      model: "gpt-6-luna",
      reasoning: { effort: "none" },
      max_output_tokens: 800,
      store: false,
      instructions: input.instructions,
      input: [{ role: "user", content: input.messages[0].text }],
      stream: true,
    });
    return providerResponse([
      providerDelta("First 👋"),
      providerDelta("\n\nSecond"),
      providerComplete(),
      providerDelta("late"),
    ]);
  };
  const result = await Array.fromAsync(
    new OpenAIClient({ apiKey: "fixture-no-network" }, transport).generate(
      input,
      new AbortController().signal,
    ),
  );
  expect(result).toEqual([
    { type: "delta", text: "First 👋" },
    { type: "delta", text: "\n\nSecond" },
    { type: "complete" },
  ]);
  expect(calls).toBe(1);
});

for (const failure of [
  [{ type: "response.incomplete", response: { status: "incomplete" } }],
  [{ type: "response.failed", response: { status: "failed" } }],
  [{ type: "error", message: "Private provider details" }],
  [],
  [{ ...providerComplete(), response: { status: "incomplete" } }],
]) {
  test(`incomplete provider lifecycle cannot report success: ${failure[0]?.type ?? "EOF"}`, async () => {
    const client = new OpenAIClient(
      { apiKey: "fixture-no-network" },
      async () => providerResponse([providerDelta("Partial"), ...failure]),
    );
    const events = await Array.fromAsync(
      client.generate(input, new AbortController().signal),
    );
    expect(events).toEqual([
      { type: "delta", text: "Partial" },
      { type: "error", error: assistantErrors.reply_failed },
    ]);
  });
}

test("SDK retries are disabled and provider error bodies never reach the caller", async () => {
  let calls = 0;
  const client = new OpenAIClient(
    { apiKey: "fixture-no-network" },
    async () => {
      calls += 1;
      return Response.json(
        {
          error: {
            message: "Private provider error body",
            type: "server_error",
          },
        },
        { status: 503 },
      );
    },
  );
  expect(
    await Array.fromAsync(client.generate(input, new AbortController().signal)),
  ).toEqual([{ type: "error", error: assistantErrors.unavailable }]);
  expect(calls).toBe(1);
});

test("abort reaches the SDK transport and never becomes a successful partial reply", async () => {
  let transportSignal: AbortSignal | undefined;
  let cancelled = false;
  const client = new OpenAIClient(
    { apiKey: "fixture-no-network" },
    async (_url, options) => {
      transportSignal = options?.signal ?? undefined;
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify(providerDelta("Partial"))}\n\n`,
              ),
            );
            transportSignal?.addEventListener(
              "abort",
              () =>
                controller.error(new DOMException("Cancelled", "AbortError")),
              { once: true },
            );
          },
          cancel() {
            cancelled = true;
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  );
  const controller = new AbortController();
  const iterator = client.generate(input, controller.signal);
  expect((await iterator.next()).value).toEqual({
    type: "delta",
    text: "Partial",
  });
  controller.abort();
  await expect(iterator.next()).rejects.toThrow();
  expect(transportSignal?.aborted).toBe(true);
  expect(cancelled || transportSignal?.aborted).toBe(true);
});
