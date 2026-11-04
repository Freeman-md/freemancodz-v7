import { assistantErrors, assistantRequestSchema } from "./schemas";
import { buildAssistantContext } from "./helpers/context";
import type { AssistantEvent, AssistantModel, AssistantRequest } from "./types";

export class AssistantService {
  constructor(private readonly model: AssistantModel) {}

  handleMessage(
    input: unknown,
    signal: AbortSignal,
  ): AsyncIterable<AssistantEvent> {
    const request = assistantRequestSchema.parse(input);
    signal.throwIfAborted();
    return this.generate(request, signal);
  }

  private async *generate(
    request: AssistantRequest,
    signal: AbortSignal,
  ): AsyncGenerator<AssistantEvent> {
    try {
      const input = {
        instructions: buildAssistantContext(),
        messages: request.messages,
      };
      for await (const event of this.model.generate(input, signal)) {
        signal.throwIfAborted();
        if (event.type === "delta") {
          yield { type: "delta", text: event.text };
        } else if (event.type === "complete") {
          yield { type: "complete" };
          return;
        } else {
          yield { type: "error", error: assistantErrors[event.error.code] };
          return;
        }
      }
    } catch {
      signal.throwIfAborted();
    }
    yield { type: "error", error: assistantErrors.reply_failed };
  }
}
