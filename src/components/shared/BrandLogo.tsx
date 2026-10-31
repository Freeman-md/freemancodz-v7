import type { MouseEventHandler } from "react";
import { handleAnchorClick } from "@/lib/navigation/anchor-navigation";
import styles from "./BrandLogo.module.css";

export function BrandLogo({
  onNavigate = handleAnchorClick,
}: {
  onNavigate?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- Native hash navigation also focuses the home section across documents.
    <a
      href="/#top"
      className={styles.logo}
      aria-label="Freemancodz home"
      onClick={onNavigate}
    >
      <span className={styles.dark} />
      <span className={styles.light} />
    </a>
  );
}
