import type { AssistantMessage, RequestReply } from "@/types/assistant";
import {
  assistantHttpErrorSchema,
  assistantLimits,
  assistantRequestSchema,
} from "./schemas";
import { decodeAssistantStream } from "./helpers/stream";
import type { AssistantRequest } from "./types";

export function selectRecentHistory(
  messages: readonly AssistantMessage[],
): AssistantRequest {
  let history = messages
    .filter((message) => message.text.trim().length > 0)
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

export const requestAssistantReply: RequestReply = async (
  messages,
  { signal, onChunk },
) => {
  const request = selectRecentHistory(messages);
  const operation = new AbortController();
  let pendingText = "";
  let batchTimer: ReturnType<typeof setTimeout> | undefined;
  let hasDeliveredText = false;

  function clearBatch() {
    clearTimeout(batchTimer);
    batchTimer = undefined;
    pendingText = "";
  }

  function cancel() {
    clearBatch();
    operation.abort();
  }

  function flush() {
    clearTimeout(batchTimer);
    batchTimer = undefined;
    if (operation.signal.aborted || !pendingText) {
      return;
    }
    const text = pendingText;
    pendingText = "";
    onChunk(text);
  }

  signal.addEventListener("abort", cancel, { once: true });
  const deadline = setTimeout(cancel, assistantLimits.timeoutMilliseconds);
  try {
    signal.throwIfAborted();
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: operation.signal,
    });
    if (!response.ok) {
      assistantHttpErrorSchema.parse(await response.json());
      throw new Error("The assistant request failed.");
    }
    if (
      !response.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/x-ndjson") ||
      !response.body
    ) {
      throw new Error("The assistant response is not an NDJSON stream.");
    }
    for await (const event of decodeAssistantStream(
      response.body,
      operation.signal,
    )) {
      operation.signal.throwIfAborted();
      if (event.type === "delta") {
        if (!hasDeliveredText) {
          hasDeliveredText = true;
          onChunk(event.text);
        } else {
          pendingText += event.text;
          batchTimer ??= setTimeout(flush, 50);
        }
      } else if (event.type === "complete") {
        flush();
        operation.signal.throwIfAborted();
        return;
      } else {
        throw new Error("The assistant reply failed.");
      }
    }
    throw new Error("The assistant reply did not complete.");
  } finally {
    clearTimeout(deadline);
    clearBatch();
    signal.removeEventListener("abort", cancel);
    operation.abort();
  }
};
