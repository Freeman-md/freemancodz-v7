import type {
  AssistantEvent,
  AssistantGeneration,
  AssistantModel,
} from "@/modules/assistant/types";

export class FakeAssistantModel implements AssistantModel {
  readonly calls: { input: AssistantGeneration; signal: AbortSignal }[] = [];

  constructor(
    private readonly events: AssistantEvent[],
    private readonly fails = false,
  ) {}

  async *generate(
    input: AssistantGeneration,
    signal: AbortSignal,
  ): AsyncGenerator<AssistantEvent> {
    this.calls.push({ input, signal });
    for (const event of this.events) {
      signal.throwIfAborted();
      yield event;
    }
    if (this.fails) {
      throw new Error("Private provider error must not escape.");
    }
  }
}
