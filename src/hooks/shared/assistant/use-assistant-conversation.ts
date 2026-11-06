import { useEffect, useRef, useState } from "react";
import { requestAssistantReply } from "@/modules/assistant/client";
import { assistantErrors } from "@/modules/assistant/schemas";
import type { AssistantMessage } from "@/types/assistant";

export function useAssistantConversation() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState("");
  const [pendingReply, setPendingReply] = useState<AssistantMessage | null>(
    null,
  );
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const nextId = useRef(0);

  async function submit(text = draft) {
    if (!text.trim() || pending.current) {
      return;
    }

    const controller = new AbortController();
    pending.current = controller;
    const id = ++nextId.current;
    const history: AssistantMessage[] = [
      ...messages,
      { id: `user-${id}`, role: "user", text },
    ];
    setMessages(history);
    setPendingReply(null);
    setDraft("");
    setError("");
    setIsReplying(true);

    try {
      let text = "";
      await requestAssistantReply(
        history,
        (event) => {
          if (!mounted.current || pending.current !== controller) {
            return;
          }
          if (event.type === "delta") {
            text += event.text;
            setPendingReply({ id: `reply-${id}`, role: "assistant", text });
          } else if (event.type === "complete") {
            setMessages([
              ...history,
              {
                id: `reply-${id}`,
                role: "assistant",
                text,
                sources: event.sources,
              },
            ]);
            setPendingReply(null);
          }
        },
        controller.signal,
      );
    } catch {
      if (mounted.current && pending.current === controller) {
        setError(assistantErrors.reply_failed.message);
      }
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        if (mounted.current) {
          setIsReplying(false);
        }
      }
    }
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.abort();
      pending.current = null;
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

  return {
    messages,
    pendingReply,
    draft,
    setDraft,
    submit,
    isReplying,
    error,
    announcement,
  };
}
