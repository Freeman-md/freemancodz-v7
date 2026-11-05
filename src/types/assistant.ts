export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type AssistantPhase = "closed" | "opening" | "open" | "closing";
