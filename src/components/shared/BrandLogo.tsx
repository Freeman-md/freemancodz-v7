import Link from "next/link";
import type { MouseEventHandler } from "react";
import { handleAnchorClick } from "@/lib/navigation/anchor-navigation";
import styles from "./BrandLogo.module.css";

export function BrandLogo({
  onNavigate = handleAnchorClick,
}: {
  onNavigate?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href="/#top"
      className={styles.logo}
      aria-label="Freemancodz home"
      onClick={onNavigate}
    >
      <span className={styles.dark} />
      <span className={styles.light} />
    </Link>
  );
}
