"use client";

import { useRef } from "react";
import type { Service } from "@/data/services";
import { useServiceDisclosure } from "@/hooks/use-service-disclosure";
import { useServicesReveal } from "@/hooks/use-services-reveal";
import { ServiceItem } from "./ServiceItem";
import styles from "./ServiceList.module.css";

export function ServiceList({ services }: { services: readonly Service[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const disclosure = useServiceDisclosure(listRef);
  useServicesReveal(listRef);

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
