export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "waiting" | "streaming" | "complete" | "stopped" | "failed";
};

export type RequestReply = (
  messages: readonly AssistantMessage[],
  options: { signal: AbortSignal; onChunk: (text: string) => void },
) => Promise<void>;

export type AssistantPhase = "closed" | "opening" | "open" | "closing";
