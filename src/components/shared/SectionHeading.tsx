import styles from "./SectionHeading.module.css";

export function SectionHeading({
  id,
  level,
  children,
  watermark,
}: {
  id: string;
  level: 1 | 2;
  children: string;
  watermark: string;
}) {
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <div className={styles.group} data-work-heading>
      <span
        aria-hidden="true"
        className={styles.watermark}
        data-work-reveal="watermark"
      >
        {watermark}
      </span>
      <Heading id={id} tabIndex={-1} className={styles.heading}>
        <span data-work-reveal="heading">{children}</span>
      </Heading>
    </div>
  );
}
