import { z } from "zod";

const configurationSchema = z.strictObject({
  apiKey: z.string().trim().min(1),
});
export type OpenAIConfiguration = z.infer<typeof configurationSchema>;

export const assistantGenerationSettings = {
  model: "gpt-6-luna",
  reasoning: { effort: "none" },
  max_output_tokens: 800,
  store: false,
} as const;

export function getOpenAIConfiguration(): OpenAIConfiguration {
  if (typeof window !== "undefined") {
    throw new Error("Assistant configuration is server-only.");
  }
  return configurationSchema.parse({ apiKey: process.env.OPENAI_API_KEY });
}
