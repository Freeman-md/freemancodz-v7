import { ArrowUp, Square } from "lucide-react";
import { useId, useRef } from "react";
import styles from "./AssistantComposer.module.css";

type Props = {
  draft: string;
  setDraft: (draft: string) => void;
  isReplying: boolean;
  isDesktop: boolean;
  submit: () => void;
  stop: () => void;
};

export function AssistantComposer({
  draft,
  setDraft,
  isReplying,
  isDesktop,
  submit,
  stop,
}: Props) {
  const fieldId = useId();
  const composing = useRef(false);

  return (
    <form
      className={styles.composer}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={fieldId}>Your message</label>
      <div className={styles.field}>
        <textarea
          id={fieldId}
          value={draft}
          placeholder="Ask a question…"
          onChange={(event) => setDraft(event.target.value)}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              isDesktop &&
              !event.shiftKey &&
              !composing.current &&
              !event.nativeEvent.isComposing &&
              event.keyCode !== 229
            ) {
              event.preventDefault();
              submit();
            }
          }}
        />
        {isReplying ? (
          <button
            type="button"
            aria-label="Stop response"
            onClick={(event) => {
              event.preventDefault();
              stop();
            }}
          >
            <Square size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send message"
            disabled={!draft.trim()}
          >
            <ArrowUp size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}
