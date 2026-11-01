import Image from "next/image";
import { Mail, Table2, Check, Send } from "lucide-react";
import type { Service } from "@/data/services";
import styles from "./ServicePreview.module.css";

export function ServicePreview({ preview }: { preview: Service["preview"] }) {
  if (preview === "selection") {
    return (
      <Image
        src="/images/projects/jpscents/selection.jpg"
        alt="The genuine JPScents product-selection interface"
        width={1440}
        height={1000}
        sizes="(min-width:768px) 280px, 136px"
        className={styles.selection}
      />
    );
  }

  return (
    <div
      className={styles.workflow}
      role="img"
      aria-label="Email PA connects Outlook to Airtable, records the processed update, and reports it in Telegram. Illustrated workflow with example data."
    >
      <span>
        <Mail aria-hidden="true" />
        Outlook
      </span>
      <i aria-hidden="true" />
      <span>
        <Table2 aria-hidden="true" />
        Airtable
        <Check size={12} aria-hidden="true" />
      </span>
      <i aria-hidden="true" />
      <span>
        <Send aria-hidden="true" />
        Telegram
      </span>
    </div>
  );
}
