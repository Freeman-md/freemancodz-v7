import type { z } from "zod";
import type {
  assistantErrorSchema,
  assistantMessageSchema,
  assistantRequestSchema,
  assistantResponseSchema,
} from "./schemas";

export type AssistantWireMessage = z.infer<typeof assistantMessageSchema>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
export type AssistantError = z.infer<typeof assistantErrorSchema>;

export type AssistantGeneration = {
  instructions: string;
  messages: AssistantWireMessage[];
};

export interface AssistantModel {
  generate(input: AssistantGeneration, signal?: AbortSignal): Promise<string>;
}
