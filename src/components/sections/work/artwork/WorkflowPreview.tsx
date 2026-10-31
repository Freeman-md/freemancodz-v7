import { Check } from "lucide-react";
import styles from "./WorkflowPreview.module.css";

export function WorkflowPreview() {
  return (
    <div
      className={styles.art}
      role="img"
      aria-label="Outlook to Airtable application-tracker workflow illustration using fictional Lumen Studio example data."
    >
      <div className={styles.mail}>
        <span>Outlook</span>
        <strong>You’re invited to interview.</strong>
        <small>Lumen Studio · Frontend Engineer</small>
      </div>
      <i className={styles.thread} aria-hidden="true" />
      <div className={styles.record}>
        <span>Airtable / Application tracker</span>
        <div>
          Lumen Studio <strong>Interviewing</strong>
        </div>
        <small>
          <Check size={11} aria-hidden="true" />
          Email recorded as processed
        </small>
      </div>
      <small className={styles.caption}>
        Workflow illustration · example data
      </small>
    </div>
  );
}
