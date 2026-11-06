import type { AssistantMessage } from "@/types/assistant";
import {
  assistantHttpErrorSchema,
  assistantLimits,
  assistantRequestSchema,
  assistantEventSchema,
} from "./schemas";
import type { AssistantEvent, AssistantRequest } from "./types";

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
  onEvent: (event: AssistantEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const controller = new AbortController();
  const requestSignal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(assistantLimits.timeoutMilliseconds),
    ...(signal ? [signal] : []),
  ]);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectRecentHistory(messages)),
      signal: requestSignal,
    });
    if (!response.ok) {
      const { error } = assistantHttpErrorSchema.parse(await response.json());
      throw new Error(error.message);
    }
    if (
      !response.headers.get("content-type")?.startsWith("text/event-stream") ||
      !response.body
    ) {
      throw new Error("Expected a streamed reply.");
    }
    reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let buffer = "";
    let text = "";
    while (true) {
      const { value, done } = await reader.read();
      requestSignal.throwIfAborted();
      buffer += decoder.decode(value, { stream: !done });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n");
        if (!data) {
          continue;
        }
        const event = assistantEventSchema.parse(JSON.parse(data));
        if (event.type === "error") {
          throw new Error(event.error.message);
        }
        if (event.type === "delta") {
          text += event.text;
        } else if (!text.trim()) {
          throw new Error("The reply was empty.");
        }
        onEvent(event);
        if (event.type === "complete") {
          return;
        }
      }
      if (done) {
        throw new Error("The reply ended without completion.");
      }
    }
  } finally {
    controller.abort();
    await reader?.cancel().catch(() => undefined);
    reader?.releaseLock();
  }
}
