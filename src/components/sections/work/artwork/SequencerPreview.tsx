import { Mail, MoveUpRight } from "lucide-react";
import styles from "./SequencerPreview.module.css";

export function SequencerPreview() {
  return (
    <div
      className={styles.art}
      role="img"
      aria-label="V5 Email Sequencer workflow illustration: a follow-up draft ready for review; queue, draft, review."
    >
      <strong>A little less busywork.</strong>
      <div className={styles.route} aria-hidden="true">
        <span className={styles.mail}>
          <Mail size={24} />
        </span>
        <i />
        <span className={styles.draft}>
          <b>Follow-up</b>
          <small>Ready for review</small>
        </span>
        <MoveUpRight size={22} />
      </div>
      <small>Queue → Draft → Review</small>
    </div>
  );
}
