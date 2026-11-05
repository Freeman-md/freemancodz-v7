import type { AssistantMessage } from "@/types/assistant";
import {
  assistantHttpErrorSchema,
  assistantLimits,
  assistantRequestSchema,
  assistantResponseSchema,
} from "./schemas";
import type { AssistantRequest } from "./types";

export function selectRecentHistory(
  messages: readonly AssistantMessage[],
): AssistantRequest {
  let history = messages
    .map(({ role, text }) => ({ role, text }))
    .slice(-assistantLimits.messages);
  while (history.length && history[0].role !== "user") {
    history = history.slice(1);
  }
  const currentQuestion = history.at(-1);
  if (
    !currentQuestion ||
    currentQuestion.role !== "user" ||
    currentQuestion.text.length > assistantLimits.userCharacters
  ) {
    throw new Error("The current question is invalid or exceeds the limit.");
  }

  while (true) {
    const request = { messages: history };
    const parsed = assistantRequestSchema.safeParse(request);
    if (
      parsed.success &&
      new TextEncoder().encode(JSON.stringify(request)).byteLength <=
        assistantLimits.bodyBytes
    ) {
      return parsed.data;
    }
    const nextTurn = history.findIndex(
      (message, index) => index > 0 && message.role === "user",
    );
    if (nextTurn < 0) {
      throw new Error("The current question exceeds the request limits.");
    }
    history = history.slice(nextTurn);
  }
}

export async function requestAssistantReply(
  messages: readonly AssistantMessage[],
): Promise<string> {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(selectRecentHistory(messages)),
    signal: AbortSignal.timeout(assistantLimits.timeoutMilliseconds),
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    const { error } = assistantHttpErrorSchema.parse(body);
    throw new Error(error.message);
  }

  return assistantResponseSchema.parse(body).text;
}
