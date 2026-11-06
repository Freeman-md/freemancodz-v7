import type { AssistantSource } from "@/modules/assistant/types";
import styles from "./AssistantSources.module.css";

export function AssistantSources({ sources }: { sources: AssistantSource[] }) {
  if (!sources.length) {
    return null;
  }
  return (
    <div className={styles.sources} role="group" aria-label="Sources">
      <p>Sources</p>
      <ul>
        {sources.map(({ id, title, url }) => (
          <li key={id}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
