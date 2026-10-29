import { Plus } from "lucide-react";
import type { MouseEventHandler, Ref } from "react";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./MobileHeader.module.css";

type MobileHeaderProps = {
  isActive?: boolean;
  isClosing?: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onMenuClick: () => void;
  onNavigate?: MouseEventHandler<HTMLAnchorElement>;
};

export function MobileHeader({
  isActive = false,
  isClosing = false,
  buttonRef,
  onMenuClick,
  onNavigate,
}: MobileHeaderProps) {
  return (
    <div
      className={styles.header}
      data-site-header="mobile"
      data-active={isActive}
      data-closing={isClosing}
    >
      <BrandLogo onNavigate={onNavigate} />
      <div className={styles.controls}>
        <ThemeToggle />
        <button
          ref={buttonRef}
          className={styles.menu}
          type="button"
          aria-label={isActive ? "Close navigation" : "Open navigation"}
          aria-expanded={isActive}
          aria-haspopup="dialog"
          onClick={onMenuClick}
        >
          <Plus aria-hidden="true" size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
