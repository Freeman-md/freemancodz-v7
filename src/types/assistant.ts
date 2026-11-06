import type { AssistantSource } from "@/modules/assistant/types";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: AssistantSource[];
};

export type AssistantPhase = "closed" | "opening" | "open" | "closing";
