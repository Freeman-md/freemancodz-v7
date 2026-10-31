import { ShieldCheck } from "lucide-react";
import styles from "./RecoveryPreview.module.css";

export function RecoveryPreview() {
  return (
    <div
      className={styles.art}
      role="img"
      aria-label="V5 self-healing research illustration: recovery is not done until verified; observe, diagnose, recover, verify."
    >
      <ShieldCheck size={36} strokeWidth={1} aria-hidden="true" />
      <strong>
        Recovery isn’t done
        <br />
        until it’s verified.
      </strong>
      <div className={styles.checkpoints} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <small>Observe · Diagnose · Recover · Verify</small>
    </div>
  );
}
