import { buildAssistantContext } from "./helpers/context";
import type { AssistantModel, AssistantRequest } from "./types";

export class AssistantService {
  constructor(private readonly model: AssistantModel) {}

  handleMessage(
    request: AssistantRequest,
    signal?: AbortSignal,
  ): Promise<string> {
    return this.model.generate(
      { instructions: buildAssistantContext(), messages: request.messages },
      signal,
    );
  }
}
