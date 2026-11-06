import { expect, test } from "@playwright/test";
import {
  assistantErrors,
  assistantEventSchema,
  assistantHttpErrorSchema,
  assistantLimits,
  assistantRequestSchema,
} from "@/modules/assistant/schemas";
import {
  requestAssistantReply,
  selectRecentHistory,
} from "@/modules/assistant/client";
import type { AssistantMessage } from "@/types/assistant";

test("strict contracts reject unknown fields, roles, empty text, final assistant and every request limit", () => {
  const user = { role: "user", text: "  Hello 👋\n\nSecond paragraph  " };
  expect(
    assistantRequestSchema.parse({ messages: [user] }).messages[0].text,
  ).toBe(user.text);
  for (const input of [
    {},
    { messages: [] },
    { messages: [user], model: "override" },
    { messages: [{ ...user, role: "system" }] },
    { messages: [{ ...user, id: "extra" }] },
    { messages: [{ ...user, text: " \n " }] },
    { messages: [{ ...user, role: "assistant" }] },
    { messages: [{ ...user, text: "a".repeat(4001) }] },
    { messages: Array.from({ length: 21 }, () => user) },
    {
      messages: Array.from({ length: 4 }, () => ({
        ...user,
        text: "a".repeat(3001),
      })),
    },
  ]) {
    expect(assistantRequestSchema.safeParse(input).success).toBe(false);
  }
  expect(
    assistantRequestSchema.safeParse({
      messages: Array.from({ length: 3 }, () => ({
        ...user,
        text: "a".repeat(4000),
      })),
    }).success,
  ).toBe(true);
  expect(
    assistantHttpErrorSchema.parse({ error: assistantErrors.unavailable }),
  ).toEqual({ error: assistantErrors.unavailable });
  expect(
    assistantHttpErrorSchema.safeParse({
      error: { code: "private", message: "x" },
    }).success,
  ).toBe(false);
  expect(
    assistantEventSchema.parse({ type: "delta", text: user.text }),
  ).toEqual({
    type: "delta",
    text: user.text,
  });
  for (const body of [
    { type: "delta", text: "" },
    { type: "complete", sources: [], extra: true },
    { other: "ok" },
  ]) {
    expect(assistantEventSchema.safeParse(body).success).toBe(false);
  }
});

test("recent history drops whole oldest turns, strips UI data and never truncates the current question", () => {
  const messages: AssistantMessage[] = Array.from(
    { length: 15 },
    (_, index) => [
      { id: `u-${index}`, role: "user" as const, text: "a".repeat(1000) },
      {
        id: `a-${index}`,
        role: "assistant" as const,
        text: "b".repeat(1000),
      },
    ],
  ).flat();
  const current = "  Current question 👋\n\nKeep this formatting  ";
  messages.push({ id: "current", role: "user", text: current });
  const request = selectRecentHistory(messages);
  expect(request.messages[0].role).toBe("user");
  expect(request.messages.at(-1)?.text).toBe(current);
  expect(request.messages.length).toBeLessThanOrEqual(assistantLimits.messages);
  expect(
    request.messages.reduce((total, message) => total + message.text.length, 0),
  ).toBeLessThanOrEqual(assistantLimits.textCharacters);
  expect(Object.keys(request.messages[0])).toEqual(["role", "text"]);
  expect(() =>
    selectRecentHistory([
      { id: "too-long", role: "user", text: "x".repeat(4001) },
    ]),
  ).toThrow();
});

test("history also fits the byte limit when JSON escaping expands text", () => {
  const messages: AssistantMessage[] = Array.from(
    { length: 4 },
    (_, index) => ({
      id: String(index),
      role: "user",
      text: "\u0001".repeat(3000),
    }),
  );
  const request = selectRecentHistory(messages);
  expect(
    new TextEncoder().encode(JSON.stringify(request)).byteLength,
  ).toBeLessThanOrEqual(assistantLimits.bodyBytes);
  expect(request.messages.at(-1)?.text).toBe(messages.at(-1)?.text);
});

const originalFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
});
const messages: AssistantMessage[] = [{ id: "u", role: "user", text: "Hello" }];

test("browser transport decodes fragmented UTF-8 and SSE frames without pacing or whitespace loss", async () => {
  const text = "  Hello 👋\n\nSecond paragraph  ";
  const bytes = new TextEncoder().encode(
    `data: ${JSON.stringify({ type: "delta", text })}\r\n\r\ndata: ${JSON.stringify({ type: "complete", sources: [] })}\n\n`,
  );
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          for (const byte of bytes) {
            controller.enqueue(new Uint8Array([byte]));
          }
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  const events: unknown[] = [];
  await requestAssistantReply(messages, (event) => events.push(event));
  expect(events).toEqual([
    { type: "delta", text },
    { type: "complete", sources: [] },
  ]);
});

for (const [name, body] of [
  ["truncated", 'data: {"type":"delta","text":"partial"}\n\n'],
  ["malformed", "data: nope\n\n"],
  ["empty", 'data: {"type":"complete","sources":[]}\n\n'],
  ["unknown field", 'data: {"type":"delta","text":"ok","extra":true}\n\n'],
  [
    "unsafe source",
    'data: {"type":"delta","text":"ok"}\n\ndata: {"type":"complete","sources":[{"id":"x","title":"x","url":"javascript:alert(1)"}]}\n\n',
  ],
  [
    "terminal failure",
    'data: {"type":"delta","text":"partial"}\n\ndata: {"type":"error","error":{"code":"reply_failed","message":"Failed"}}\n\n',
  ],
]) {
  test(`browser transport rejects ${name} output`, async () => {
    globalThis.fetch = async () =>
      new Response(body, { headers: { "Content-Type": "text/event-stream" } });
    const events: unknown[] = [];
    await expect(
      requestAssistantReply(messages, (event) => events.push(event)),
    ).rejects.toThrow();
    expect(events).not.toContainEqual({ type: "complete", sources: [] });
  });
}

test("browser transport rejects invalid UTF-8 and cancels abandoned reads", async () => {
  globalThis.fetch = async () =>
    new Response(new Uint8Array([0xff]), {
      headers: { "Content-Type": "text/event-stream" },
    });
  await expect(
    requestAssistantReply(messages, () => undefined),
  ).rejects.toThrow();

  const controller = new AbortController();
  const reading = Promise.withResolvers<void>();
  globalThis.fetch = async (_url, options) =>
    new Response(
      new ReadableStream({
        start(output) {
          options?.signal?.addEventListener(
            "abort",
            () => output.error(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
          reading.resolve();
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  const events: unknown[] = [];
  const result = requestAssistantReply(
    messages,
    (event) => events.push(event),
    controller.signal,
  );
  await reading.promise;
  controller.abort();
  await expect(result).rejects.toThrow();
  expect(events).toEqual([]);
});
