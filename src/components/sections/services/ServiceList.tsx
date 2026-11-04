"use client";

import { useRef } from "react";
import type { Service } from "@/data/services";
import { useServiceDisclosure } from "@/hooks/home/services/use-service-disclosure";
import { useSectionReveal } from "@/hooks/shared/use-section-reveal";
import { ServiceItem } from "./ServiceItem";
import styles from "./ServiceList.module.css";

export function ServiceList({ services }: { services: readonly Service[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const disclosure = useServiceDisclosure(listRef);
  useSectionReveal(listRef, { focusPolicy: "section-context" });

  return (
    <div
      ref={listRef}
      className={styles.list}
      data-services-enhanced={disclosure.isEnhanced}
    >
      {services.map((service) => (
        <div
          key={service.id}
          data-service-row={service.id}
          className={styles.entrance}
        >
          <ServiceItem
            service={service}
            isOpen={
              !disclosure.isEnhanced ||
              disclosure.selectedService === service.id
            }
            isEnhanced={disclosure.isEnhanced}
            animate={disclosure.hasInteracted}
            onToggle={() => disclosure.toggleService(service.id)}
            onPointerEnter={(event) =>
              disclosure.scheduleHover(service.id, event)
            }
            onPointerLeave={disclosure.cancelHover}
          />
        </div>
      ))}
    </div>
  );
}
