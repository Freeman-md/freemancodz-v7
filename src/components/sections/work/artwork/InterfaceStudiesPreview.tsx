import Image from "next/image";
import styles from "./InterfaceStudiesPreview.module.css";

export function InterfaceStudiesPreview() {
  return (
    <div className={styles.art}>
      <div className={styles.search}>
        <Image
          src="/images/projects/interface-studies/search.png"
          alt="Genuine Raycast-inspired search interface study"
          width={1300}
          height={1242}
          sizes="(min-width: 1280px) 540px, 100vw"
        />
      </div>
      <Image
        className={styles.booking}
        src="/images/projects/interface-studies/booking.png"
        alt="Genuine Cal.com-inspired booking study"
        width={1300}
        height={1186}
        sizes="(min-width: 1280px) 183px, 40vw"
      />
      <Image
        className={styles.triage}
        src="/images/projects/interface-studies/triage.jpg"
        alt="Genuine Linear-inspired inbox-triage study"
        width={1088}
        height={720}
        sizes="(min-width: 1280px) 162px, 36vw"
      />
    </div>
  );
}
