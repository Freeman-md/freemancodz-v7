import OpenAI from "openai";
import { assistantErrors, assistantLimits } from "@/modules/assistant/schemas";
import type {
  AssistantEvent,
  AssistantGeneration,
  AssistantModel,
} from "@/modules/assistant/types";
import {
  assistantGenerationSettings,
  type OpenAIConfiguration,
} from "./config";

export class OpenAIClient implements AssistantModel {
  private readonly client: OpenAI;

  constructor(configuration: OpenAIConfiguration, transport?: typeof fetch) {
    this.client = new OpenAI({
      apiKey: configuration.apiKey,
      baseURL: "https://api.openai.com/v1",
      maxRetries: 0,
      logLevel: "off",
      timeout: assistantLimits.timeoutMilliseconds,
      fetch: transport,
    });
  }

  async *generate(
    input: AssistantGeneration,
    signal: AbortSignal,
  ): AsyncGenerator<AssistantEvent> {
    try {
      signal.throwIfAborted();
      const stream = await this.client.responses.create(
        {
          ...assistantGenerationSettings,
          instructions: input.instructions,
          input: input.messages.map(({ role, text }) => ({
            role,
            content: text,
          })),
          stream: true,
        },
        { signal },
      );
      let hasText = false;

      try {
        for await (const event of stream) {
          signal.throwIfAborted();
          if (event.type === "response.output_text.delta" && event.delta) {
            hasText = true;
            yield { type: "delta", text: event.delta };
          } else if (event.type === "response.completed") {
            if (
              !hasText ||
              event.response.status !== "completed" ||
              event.response.error ||
              event.response.incomplete_details
            ) {
              throw new Error(
                "Provider did not confirm a complete text reply.",
              );
            }
            yield { type: "complete" };
            return;
          } else if (
            event.type === "response.failed" ||
            event.type === "response.incomplete" ||
            event.type === "error"
          ) {
            throw new Error("Provider generation failed.");
          }
        }
        signal.throwIfAborted();
        throw new Error("Provider stream ended without completion.");
      } finally {
        stream.controller.abort();
      }
    } catch (error) {
      signal.throwIfAborted();
      const unavailable =
        error instanceof OpenAI.APIConnectionError ||
        (error instanceof OpenAI.APIError &&
          [401, 403, 429, 500, 502, 503, 504].includes(error.status ?? 0));
      yield {
        type: "error",
        error: unavailable
          ? assistantErrors.unavailable
          : assistantErrors.reply_failed,
      };
    }
  }
}
