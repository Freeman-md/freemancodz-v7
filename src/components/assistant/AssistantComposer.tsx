import { ArrowUp } from "lucide-react";
import { useId, useRef } from "react";
import styles from "./AssistantComposer.module.css";

type Props = {
  draft: string;
  setDraft: (draft: string) => void;
  isReplying: boolean;
  isDesktop: boolean;
  submit: () => void;
};

export function AssistantComposer({
  draft,
  setDraft,
  isReplying,
  isDesktop,
  submit,
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
        <button
          type="submit"
          aria-label="Send message"
          disabled={isReplying || !draft.trim()}
        >
          <ArrowUp size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
