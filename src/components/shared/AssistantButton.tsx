import type { ComponentPropsWithRef } from "react";
import styles from "./AssistantButton.module.css";

export function AssistantButton(props: ComponentPropsWithRef<"button">) {
  return (
    <button
      type="button"
      aria-label="Open AI assistant"
      aria-haspopup="dialog"
      className={styles.button}
      {...props}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 4h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    </button>
  );
}
