import { OpenAIClient } from "@/infrastructure/openai/client";
import {
  getOpenAIConfiguration,
  getAssistantStoreId,
} from "@/infrastructure/openai/config";
import { AssistantService } from "@/modules/assistant/service";
import {
  assistantErrors,
  assistantLimits,
  assistantRequestSchema,
} from "@/modules/assistant/schemas";
import type { AssistantError } from "@/modules/assistant/types";

function errorResponse(error: AssistantError, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  let input: unknown;

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > assistantLimits.bodyBytes) {
      return errorResponse(assistantErrors.invalid_request, 413);
    }
    input = JSON.parse(body);
  } catch {
    return errorResponse(assistantErrors.invalid_request, 400);
  }

  const parsed = assistantRequestSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse(assistantErrors.invalid_request, 400);
  }

  let client: OpenAIClient;
  try {
    client = new OpenAIClient(
      getOpenAIConfiguration(),
      undefined,
      getAssistantStoreId(),
    );
  } catch {
    return errorResponse(assistantErrors.unavailable, 503);
  }

  const controller = new AbortController();
  const signal = AbortSignal.any([
    request.signal,
    controller.signal,
    AbortSignal.timeout(assistantLimits.timeoutMilliseconds),
  ]);
  const service = new AssistantService(client);
  const encoder = new TextEncoder();
  const events = service
    .handleMessage(parsed.data, signal)
    [Symbol.asyncIterator]();
  let finished = false;

  const stream = new ReadableStream<Uint8Array>({
    async pull(output) {
      try {
        const next = await events.next();
        signal.throwIfAborted();
        if (next.done) {
          throw new Error("Reply ended without completion.");
        }
        output.enqueue(
          encoder.encode(`data: ${JSON.stringify(next.value)}\n\n`),
        );
        if (next.value.type !== "delta") {
          finished = true;
          output.close();
          await events.return?.();
        }
      } catch {
        if (!finished) {
          finished = true;
          output.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: assistantErrors.reply_failed })}\n\n`,
            ),
          );
          output.close();
        }
        controller.abort();
      }
    },
    async cancel() {
      finished = true;
      controller.abort();
      await events.return?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
    },
  });
}
