import type { Ref } from "react";
import { assistantPresets, assistantWelcome } from "@/data/assistant";
import type { AssistantMessage } from "@/types/assistant";
import styles from "./AssistantMessages.module.css";

type Props = {
  messages: AssistantMessage[];
  submit: (text: string) => void;
  error: string;
  isReplying: boolean;
  transcriptRef: Ref<HTMLDivElement>;
  messageBaseline: number;
  animateWelcome: boolean;
};

export function AssistantMessages({
  messages,
  submit,
  error,
  isReplying,
  transcriptRef,
  messageBaseline,
  animateWelcome,
}: Props) {
  return (
    <div className={styles.shell}>
      <div
        ref={transcriptRef}
        className={styles.scroller}
        role="region"
        aria-label="Conversation"
        tabIndex={0}
      >
        <div className={styles.contents}>
          {messages.length === 0 ? (
            <div className={styles.welcome} data-animate={animateWelcome}>
              <div className={styles.introduction}>
                <h2>{assistantWelcome.heading}</h2>
                <p>{assistantWelcome.support}</p>
              </div>
              <div className={styles.presets}>
                {assistantPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => submit(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <article
                key={message.id}
                className={
                  message.role === "user" ? styles.user : styles.assistant
                }
                data-arrive={
                  message.role === "user" && index >= messageBaseline
                }
                aria-label={message.role === "user" ? "You" : "Assistant"}
              >
                <div className={styles.author}>
                  {message.role === "user" ? "You" : "Assistant"}
                </div>
                {message.text && (
                  <div className={styles.body}>
                    {message.role === "user" && <p>{message.text}</p>}
                    {message.role === "assistant" &&
                      message.text
                        .split("\n\n")
                        .map((paragraph, paragraphIndex) => (
                          <p key={paragraphIndex}>{paragraph}</p>
                        ))}
                  </div>
                )}
              </article>
            ))
          )}
          {isReplying && <p className={styles.status}>Thinking…</p>}
          {error && <p className={styles.failure}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
