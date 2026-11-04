import { OpenAIClient } from "@/infrastructure/openai/client";
import { getOpenAIConfiguration } from "@/infrastructure/openai/config";
import { AssistantService } from "@/modules/assistant/service";
import {
  assistantErrors,
  assistantHttpErrorSchema,
  assistantLimits,
  assistantRequestSchema,
} from "@/modules/assistant/schemas";
import { encodeAssistantEvent } from "@/modules/assistant/helpers/stream";
import type { AssistantError, AssistantEvent } from "@/modules/assistant/types";

class BodyLimitError extends Error {}

function untilAborted<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
    if (signal.aborted) {
      abort();
    }
  });
}

async function readBody(
  request: Request,
  signal: AbortSignal,
): Promise<unknown> {
  if (
    Number(request.headers.get("content-length")) > assistantLimits.bodyBytes
  ) {
    throw new BodyLimitError();
  }
  if (!request.body) {
    throw new SyntaxError();
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let body = "";
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await untilAborted(reader.read(), signal);
      if (done) {
        break;
      }
      bytes += value.byteLength;
      if (bytes > assistantLimits.bodyBytes) {
        throw new BodyLimitError();
      }
      body += decoder.decode(value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } finally {
    signal.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}

function errorResponse(error: AssistantError, status: number) {
  return Response.json(assistantHttpErrorSchema.parse({ error }), {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const operation = new AbortController();
  const cancelRequest = () =>
    operation.abort(new DOMException("Request cancelled.", "AbortError"));
  request.signal.addEventListener("abort", cancelRequest, { once: true });
  if (request.signal.aborted) {
    cancelRequest();
  }
  const deadline = setTimeout(
    () =>
      operation.abort(
        new DOMException("Reply deadline exceeded.", "TimeoutError"),
      ),
    assistantLimits.timeoutMilliseconds,
  );
  let iterator: AsyncIterator<AssistantEvent> | undefined;
  let settled = false;
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;

  function cleanup() {
    clearTimeout(deadline);
    request.signal.removeEventListener("abort", cancelRequest);
    operation.signal.removeEventListener("abort", abortStream);
    if (!operation.signal.aborted) {
      operation.abort();
    }
    void iterator?.return?.().catch(() => {});
  }

  function abortStream() {
    if (settled || !streamController) {
      return;
    }
    settled = true;
    streamController.enqueue(
      encodeAssistantEvent({
        type: "error",
        error: assistantErrors.reply_failed,
      }),
    );
    streamController.close();
    cleanup();
  }

  try {
    let input: unknown;
    try {
      input = await readBody(request, operation.signal);
    } catch (error) {
      if (operation.signal.aborted) {
        throw error;
      }
      settled = true;
      cleanup();
      return errorResponse(
        assistantErrors.invalid_request,
        error instanceof BodyLimitError ? 413 : 400,
      );
    }
    const parsed = assistantRequestSchema.safeParse(input);
    if (!parsed.success) {
      settled = true;
      cleanup();
      return errorResponse(assistantErrors.invalid_request, 400);
    }
    let client: OpenAIClient;
    try {
      client = new OpenAIClient(getOpenAIConfiguration());
    } catch {
      settled = true;
      cleanup();
      return errorResponse(assistantErrors.unavailable, 503);
    }
    const service = new AssistantService(client);
    iterator = service
      .handleMessage(parsed.data, operation.signal)
      [Symbol.asyncIterator]();
    const first = await untilAborted(iterator.next(), operation.signal);
    if (first.done) {
      throw new Error("Reply ended without a terminal event.");
    }
    if (first.value.type === "error") {
      settled = true;
      cleanup();
      return errorResponse(
        first.value.error,
        first.value.error.code === "unavailable" ? 503 : 502,
      );
    }

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
        controller.enqueue(encodeAssistantEvent(first.value));
        operation.signal.addEventListener("abort", abortStream, { once: true });
        if (first.value.type === "complete") {
          settled = true;
          controller.close();
          cleanup();
        } else if (operation.signal.aborted) {
          abortStream();
        }
      },
      async pull(controller) {
        if (settled) {
          return;
        }
        try {
          const next = await untilAborted(iterator!.next(), operation.signal);
          if (settled) {
            return;
          }
          if (next.done) {
            throw new Error("Reply ended without a terminal event.");
          }
          controller.enqueue(encodeAssistantEvent(next.value));
          if (next.value.type !== "delta") {
            settled = true;
            controller.close();
            cleanup();
          }
        } catch {
          abortStream();
        }
      },
      cancel() {
        settled = true;
        cleanup();
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    settled = true;
    const status =
      operation.signal.aborted &&
      operation.signal.reason?.name === "TimeoutError"
        ? 504
        : 502;
    cleanup();
    return errorResponse(
      assistantErrors.reply_failed,
      request.signal.aborted ? 499 : status,
    );
  }
}
