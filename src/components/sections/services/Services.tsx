import { SectionHeading } from "@/components/shared/SectionHeading";
import { services } from "@/data/services";
import { ServiceList } from "./ServiceList";
import styles from "./Services.module.css";

export function Services() {
  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className={styles.section}
    >
      <SectionHeading
        id="services-title"
        level={2}
        watermark="SERVICES"
        align="start"
        className={styles.heading}
      >
        / SERVICES
      </SectionHeading>
      <ServiceList services={services} />
    </section>
  );
}
