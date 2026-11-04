import { expect, test } from "@playwright/test";
import {
  assistantErrors,
  assistantEventSchema,
  assistantHttpErrorSchema,
  assistantLimits,
  assistantRequestSchema,
} from "@/modules/assistant/schemas";
import { selectRecentHistory } from "@/modules/assistant/client";
import {
  decodeAssistantStream,
  encodeAssistantEvent,
} from "@/modules/assistant/helpers/stream";
import type { AssistantMessage } from "@/types/assistant";
import { bytesStream, eventBytes } from "../../fixtures/assistant/transport";

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
    assistantEventSchema.safeParse({
      type: "error",
      error: { code: "private", message: "x" },
    }).success,
  ).toBe(false);
  expect(() =>
    encodeAssistantEvent({ type: "complete", extra: true }),
  ).toThrow();
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
        status: "complete" as const,
      },
    ],
  ).flat();
  const current = "  Current question 👋\n\nKeep this formatting  ";
  messages.push(
    { id: "current", role: "user", text: current },
    { id: "placeholder", role: "assistant", text: "", status: "waiting" },
  );
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

test("decoder preserves escaped newlines and Unicode across arbitrary one-byte fragmentation", async () => {
  const events = [
    { type: "delta" as const, text: "Hello 👋 café\n\n世界" },
    { type: "delta" as const, text: "  finished  " },
    { type: "complete" as const },
  ];
  const bytes = eventBytes(events);
  const chunks = Array.from(bytes, (byte) => new Uint8Array([byte]));
  const result = await Array.fromAsync(
    decodeAssistantStream(bytesStream(chunks)),
  );
  expect(result).toEqual(events);
  expect(
    await Array.fromAsync(decodeAssistantStream(bytesStream([bytes]))),
  ).toEqual(events);
});

for (const body of [
  "",
  '{"type":"delta","text":"partial"}\n',
  '{"type":"complete","extra":true}\n',
  "<html>platform failure</html>",
  '{"type":"delta","text":',
]) {
  test(`decoder rejects broken protocol ${body.slice(0, 25)}`, async () => {
    await expect(
      Array.fromAsync(
        decodeAssistantStream(bytesStream([new TextEncoder().encode(body)])),
      ),
    ).rejects.toThrow();
  });
}

test("terminal events stop delivery and cancellation closes the reader", async () => {
  const events = [
    { type: "complete" as const },
    { type: "delta" as const, text: "late" },
  ];
  expect(
    await Array.fromAsync(
      decodeAssistantStream(bytesStream([eventBytes(events)])),
    ),
  ).toEqual([events[0]]);
  const controller = new AbortController();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  const result = Array.fromAsync(
    decodeAssistantStream(stream, controller.signal),
  );
  controller.abort();
  await expect(result).rejects.toThrow();
  expect(cancelled).toBe(true);
});
