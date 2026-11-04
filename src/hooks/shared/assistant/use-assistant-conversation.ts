import { useEffect, useRef, useState } from "react";
import type { AssistantMessage, RequestReply } from "@/types/assistant";

type Options = {
  requestReply?: RequestReply;
  initialMessages?: AssistantMessage[];
  initialDraft?: string;
};

export function useAssistantConversation({
  requestReply,
  initialMessages = [],
  initialDraft = "",
}: Options = {}) {
  const [messages, setMessages] = useState(initialMessages);
  const messagesRef = useRef(messages);
  const [draft, setDraft] = useState(initialDraft);
  const [announcement, setAnnouncement] = useState({ sequence: 0, text: "" });
  const activeReply = useRef<{
    id: string;
    controller: AbortController;
  } | null>(null);
  const mounted = useRef(true);
  const nextId = useRef(0);

  function updateMessages(next: AssistantMessage[]) {
    messagesRef.current = next;
    setMessages(next);
  }

  function announce(text: string) {
    setAnnouncement((previous) => ({ sequence: previous.sequence + 1, text }));
  }

  function startReply(id: string, history: AssistantMessage[]) {
    if (!requestReply) {
      updateMessages(
        messagesRef.current.map((message) =>
          message.id === id ? { ...message, status: "failed" } : message,
        ),
      );
      announce("The reply couldn’t be completed. Try again.");
      return;
    }

    const operation = { id, controller: new AbortController() };
    activeReply.current = operation;
    announce("Thinking…");

    function isCurrent() {
      return mounted.current && activeReply.current === operation;
    }

    function finish(status: "complete" | "failed") {
      if (!isCurrent()) {
        return;
      }
      activeReply.current = null;
      updateMessages(
        messagesRef.current.map((message) =>
          message.id === id ? { ...message, status } : message,
        ),
      );
      announce(
        status === "complete"
          ? "Reply complete"
          : "The reply couldn’t be completed. Try again.",
      );
    }

    // The callback may throw before returning a promise as well as reject asynchronously.
    void Promise.resolve()
      .then(() => {
        if (!isCurrent()) {
          return;
        }
        return requestReply(history, {
          signal: operation.controller.signal,
          onChunk(text) {
            if (!isCurrent() || !text) {
              return;
            }
            updateMessages(
              messagesRef.current.map((message) =>
                message.id === id
                  ? {
                      ...message,
                      text: message.text + text,
                      status: "streaming",
                    }
                  : message,
              ),
            );
          },
        });
      })
      .then(
        () => finish("complete"),
        () => finish("failed"),
      );
  }

  function submit(text = draft) {
    if (!text.trim() || activeReply.current) {
      return;
    }
    const user: AssistantMessage = {
      id: `user-${++nextId.current}`,
      role: "user",
      text,
    };
    const reply: AssistantMessage = {
      id: `reply-${nextId.current}`,
      role: "assistant",
      text: "",
      status: "waiting",
    };
    const history = [...messagesRef.current, user];
    updateMessages([...history, reply]);
    setDraft("");
    startReply(reply.id, history);
  }

  function stop() {
    const operation = activeReply.current;
    if (!operation) {
      return;
    }
    activeReply.current = null;
    operation.controller.abort();
    updateMessages(
      messagesRef.current.map((message) =>
        message.id === operation.id
          ? { ...message, status: "stopped" }
          : message,
      ),
    );
    announce("Response stopped");
  }

  function retry(id: string) {
    if (activeReply.current) {
      return;
    }
    const index = messagesRef.current.findIndex(
      (message) => message.id === id && message.status === "failed",
    );
    if (index < 0) {
      return;
    }
    const history = messagesRef.current.slice(0, index);
    updateMessages(
      messagesRef.current.map((message) =>
        message.id === id
          ? { ...message, text: "", status: "waiting" }
          : message,
      ),
    );
    startReply(id, history);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const operation = activeReply.current;
      activeReply.current = null;
      operation?.controller.abort();
    };
  }, []);

  return {
    messages,
    draft,
    setDraft,
    submit,
    stop,
    retry,
    announcement,
    isReplying: messages.some(
      (message) =>
        message.status === "waiting" || message.status === "streaming",
    ),
  };
}
