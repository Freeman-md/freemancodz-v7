import { assistantEventSchema } from "../schemas";
import type { AssistantEvent } from "../types";

export function encodeAssistantEvent(event: unknown): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify(assistantEventSchema.parse(event)) + "\n",
  );
}

export async function* decodeAssistantStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<AssistantEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let pending = "";

  function cancel() {
    // An already-failed transport can reject cancellation; the read error remains authoritative.
    void reader.cancel().catch(() => {});
  }

  signal?.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      pending += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });

      let newline = pending.indexOf("\n");
      while (newline !== -1 || (done && pending.length > 0)) {
        const line = newline === -1 ? pending : pending.slice(0, newline);
        pending = newline === -1 ? "" : pending.slice(newline + 1);
        const event = assistantEventSchema.parse(JSON.parse(line));
        yield event;
        if (event.type !== "delta") {
          return;
        }
        newline = pending.indexOf("\n");
      }
      if (done) {
        throw new Error("Assistant stream ended without completion.");
      }
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}
