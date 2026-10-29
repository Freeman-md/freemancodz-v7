import { DesktopNavigation } from "./DesktopNavigation";
import { MobileNavigation } from "./MobileNavigation";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header>
      <a className={styles.skip} href="#main-content">
        Skip to content
      </a>
      <DesktopNavigation />
      <MobileNavigation />
    </header>
  );
}
