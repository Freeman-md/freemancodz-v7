import OpenAI from "openai";
import { assistantLimits } from "@/modules/assistant/schemas";
import type {
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

  async generate(
    input: AssistantGeneration,
    signal?: AbortSignal,
  ): Promise<string> {
    const response = await this.client.responses.create(
      {
        ...assistantGenerationSettings,
        instructions: input.instructions,
        input: input.messages.map(({ role, text }) => ({
          role,
          content: text,
        })),
      },
      { signal },
    );

    if (
      response.status !== "completed" ||
      response.error ||
      response.incomplete_details ||
      !response.output_text.trim()
    ) {
      throw new Error("Provider did not return a complete text reply.");
    }

    return response.output_text;
  }
}
