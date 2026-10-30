import styles from "./AssistantButton.module.css";

export function AssistantButton() {
  return (
    <button
      type="button"
      disabled
      aria-label="AI assistant — coming soon"
      className={styles.button}
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
