import { OpenAIClient } from "@/infrastructure/openai/client";
import { getOpenAIConfiguration } from "@/infrastructure/openai/config";
import { AssistantService } from "@/modules/assistant/service";
import {
  assistantErrors,
  assistantLimits,
  assistantRequestSchema,
  assistantResponseSchema,
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
    client = new OpenAIClient(getOpenAIConfiguration());
  } catch {
    return errorResponse(assistantErrors.unavailable, 503);
  }

  try {
    const service = new AssistantService(client);
    const text = await service.handleMessage(parsed.data, request.signal);
    return Response.json(assistantResponseSchema.parse({ text }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error && error.name === "APIConnectionTimeoutError";
    return errorResponse(assistantErrors.reply_failed, isTimeout ? 504 : 502);
  }
}
