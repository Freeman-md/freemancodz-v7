"use client";

import { navigationLinks } from "@/config/navigation";
import { handleAnchorClick } from "@/lib/navigation/anchor-navigation";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./DesktopNavigation.module.css";

export function DesktopNavigation() {
  return (
    <div className={styles.header} data-site-header="desktop">
      <BrandLogo />
      <nav aria-label="Primary navigation" className={styles.navigation}>
        {navigationLinks.map((link) => (
          <a key={link.href} href={link.href} onClick={handleAnchorClick}>
            {link.label}
          </a>
        ))}
        <ThemeToggle />
      </nav>
    </div>
  );
}
