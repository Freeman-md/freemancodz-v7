import { MoveUpRight, X } from "lucide-react";
import type { PointerEventHandler } from "react";
import type { Service } from "@/data/services";
import { ServicePreview } from "./ServicePreview";
import styles from "./ServiceItem.module.css";

export function ServiceItem({
  service,
  isOpen,
  isEnhanced,
  animate,
  onToggle,
  onPointerEnter,
  onPointerLeave,
}: {
  service: Service;
  isOpen: boolean;
  isEnhanced: boolean;
  animate: boolean;
  onToggle: () => void;
  onPointerEnter: PointerEventHandler<HTMLElement>;
  onPointerLeave: PointerEventHandler<HTMLElement>;
}) {
  const Icon = isOpen ? X : MoveUpRight;
  const headerId = `service-${service.id}-header`;
  const panelId = `service-${service.id}-panel`;

  return (
    <article
      className={styles.item}
      data-open={isOpen}
      data-animate={animate}
      data-preview={service.preview}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <h3 className={styles.title}>
        <button
          id={headerId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          disabled={!isEnhanced}
          className={styles.header}
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            onToggle();
          }}
        >
          <span className={styles.label}>{service.title}</span>
          <span className={styles.icon}>
            <Icon size={24} strokeWidth={2} aria-hidden="true" />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={styles.panel}
      >
        <div className={styles.expansion}>
          <div className={styles.clip}>
            <div className={styles.copy}>
              <p>{service.description}</p>
              <span className={styles.caption}>{service.caption}</span>
            </div>
          </div>
        </div>
        <div className={styles.preview}>
          <ServicePreview preview={service.preview} />
        </div>
      </div>
    </article>
  );
}
