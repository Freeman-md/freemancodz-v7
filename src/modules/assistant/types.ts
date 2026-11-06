import type { z } from "zod";
import type {
  assistantErrorSchema,
  assistantMessageSchema,
  assistantRequestSchema,
  assistantEventSchema,
  assistantSourceSchema,
} from "./schemas";

export type AssistantWireMessage = z.infer<typeof assistantMessageSchema>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
export type AssistantEvent = z.infer<typeof assistantEventSchema>;
export type AssistantSource = z.infer<typeof assistantSourceSchema>;
export type AssistantError = z.infer<typeof assistantErrorSchema>;

export type AssistantGeneration = {
  instructions: string;
  messages: AssistantWireMessage[];
};

export interface AssistantModel {
  generate(
    input: AssistantGeneration,
    signal?: AbortSignal,
  ): AsyncIterable<AssistantEvent>;
}
