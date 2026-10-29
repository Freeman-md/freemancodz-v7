"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeToggle } from "@/hooks/use-theme-toggle";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const { actionLabel, isMounted, toggleTheme } = useThemeToggle();

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={actionLabel}
      disabled={!isMounted}
      onClick={toggleTheme}
    >
      <Sun className={styles.sun} aria-hidden="true" strokeWidth={1.5} />
      <Moon className={styles.moon} aria-hidden="true" strokeWidth={1.5} />
    </button>
  );
}
