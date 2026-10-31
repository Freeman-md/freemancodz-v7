import { Check, MoveRight } from "lucide-react";
import styles from "./PaymentPreview.module.css";

export function PaymentPreview() {
  return (
    <div
      className={styles.art}
      role="img"
      aria-label="Pay4Me illustrated tuition payment journey from naira to dollars and a completed payment receipt. A team contribution, not a historical product screen."
    >
      <strong className={styles.brand}>
        Pay4Me<span>.</span>
      </strong>
      <div className={styles.route} aria-hidden="true">
        <span>₦</span>
        <i />
        <MoveRight size={18} />
        <span>$</span>
      </div>
      <div className={styles.receipt}>
        <span className={styles.check}>
          <Check size={17} aria-hidden="true" />
        </span>
        <div>
          <strong>
            One less thing
            <br />
            between you and next.
          </strong>
          <small>Tuition payment complete</small>
        </div>
      </div>
      <small className={styles.caption}>
        Tuition payment illustration · team contribution
      </small>
    </div>
  );
}
