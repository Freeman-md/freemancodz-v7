import { expect, test } from "@playwright/test";
import {
  assistantErrors,
  assistantResponseSchema,
  assistantHttpErrorSchema,
  assistantLimits,
  assistantRequestSchema,
} from "@/modules/assistant/schemas";
import { selectRecentHistory } from "@/modules/assistant/client";
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
  expect(assistantResponseSchema.parse({ text: user.text })).toEqual({
    text: user.text,
  });
  for (const body of [
    { text: " " },
    { text: "ok", extra: true },
    { other: "ok" },
  ]) {
    expect(assistantResponseSchema.safeParse(body).success).toBe(false);
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
