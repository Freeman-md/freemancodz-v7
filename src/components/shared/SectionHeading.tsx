import styles from "./SectionHeading.module.css";

export function SectionHeading({
  id,
  level,
  children,
  watermark,
  align = "center",
  className,
}: {
  id: string;
  level: 1 | 2;
  children: string;
  watermark: string;
  align?: "center" | "start";
  className?: string;
}) {
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <div
      className={`${styles.group} ${className ?? ""}`}
      data-section-heading
      data-align={align}
    >
      <span
        aria-hidden="true"
        className={styles.watermark}
        data-section-part="watermark"
      >
        {watermark}
      </span>
      <Heading id={id} tabIndex={-1} className={styles.heading}>
        <span data-section-part="heading">{children}</span>
      </Heading>
    </div>
  );
}
