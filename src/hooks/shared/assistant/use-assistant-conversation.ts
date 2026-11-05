import { useEffect, useRef, useState } from "react";
import { requestAssistantReply } from "@/modules/assistant/client";
import { assistantErrors } from "@/modules/assistant/schemas";
import type { AssistantMessage } from "@/types/assistant";

export function useAssistantConversation() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const mounted = useRef(true);
  const nextId = useRef(0);

  async function submit(text = draft) {
    if (!text.trim() || pending.current) {
      return;
    }

    pending.current = true;
    const id = ++nextId.current;
    const history: AssistantMessage[] = [
      ...messages,
      { id: `user-${id}`, role: "user", text },
    ];
    setMessages(history);
    setDraft("");
    setError("");
    setIsReplying(true);

    try {
      const reply = await requestAssistantReply(history);
      if (mounted.current) {
        setMessages([
          ...history,
          { id: `reply-${id}`, role: "assistant", text: reply },
        ]);
      }
    } catch {
      if (mounted.current) {
        setError(assistantErrors.reply_failed.message);
      }
    } finally {
      pending.current = false;
      if (mounted.current) {
        setIsReplying(false);
      }
    }
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  let announcement = "";
  if (isReplying) {
    announcement = "Thinking…";
  } else if (error) {
    announcement = error;
  } else if (messages.at(-1)?.role === "assistant") {
    announcement = "Reply complete";
  }

  return { messages, draft, setDraft, submit, isReplying, error, announcement };
}
