"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MoveUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { navigationLinks } from "@/config/navigation";
import { useMobileNavigation } from "@/hooks/use-mobile-navigation";
import { MobileHeader } from "./MobileHeader";
import styles from "./MobileNavigation.module.css";

export function MobileNavigation() {
  const {
    phase,
    triggerRef,
    closeRef,
    surfaceRef,
    requestOpen,
    requestClose,
    handleLinkClick,
    handleCloseAutoFocus,
    handleContentMount,
  } = useMobileNavigation();
  const isActive = phase !== "closed";

  return (
    <Dialog.Root
      open={isActive}
      onOpenChange={(open) => {
        if (!open) {
          requestClose();
        }
      }}
    >
      <div
        className={styles.closedHeader}
        style={{ visibility: isActive ? "hidden" : "visible" }}
      >
        <MobileHeader buttonRef={triggerRef} onMenuClick={requestOpen} />
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          ref={handleContentMount}
          className={styles.dialog}
          data-phase={phase}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeRef.current?.focus();
          }}
          onCloseAutoFocus={handleCloseAutoFocus}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className={styles.title}>Navigation</Dialog.Title>
          <div ref={surfaceRef} className={styles.surface}>
            <div className={styles.scrollArea}>
              <nav
                className={styles.links}
                aria-label="Primary navigation"
                inert={phase !== "open"}
              >
                {navigationLinks.map((link, index) => (
                  <a
                    key={link.href}
                    href={link.href}
                    tabIndex={phase === "open" ? 0 : -1}
                    onClick={handleLinkClick}
                    style={{ "--link-index": index } as CSSProperties}
                  >
                    {link.label}
                    <MoveUpRight size={24} strokeWidth={2} aria-hidden="true" />
                  </a>
                ))}
              </nav>
            </div>
          </div>
          <MobileHeader
            isActive
            isClosing={phase === "closing"}
            buttonRef={closeRef}
            onMenuClick={requestClose}
            onNavigate={handleLinkClick}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
