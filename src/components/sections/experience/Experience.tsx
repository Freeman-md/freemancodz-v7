import { SectionHeading } from "@/components/shared/SectionHeading";
import { experience } from "@/data/experience";
import { ExperienceList } from "./ExperienceList";
import styles from "./Experience.module.css";

export function Experience() {
  return (
    <section aria-labelledby="experience" className={styles.section}>
      <div className={styles.headingArea}>
        <SectionHeading
          id="experience"
          level={2}
          watermark="EXPERIENCE"
          align="start"
          className={styles.heading}
        >
          / EXPERIENCE
        </SectionHeading>
        <p
          className={styles.summary}
          data-experience-summary
          data-section-reveal-introduction
        >
          3+ years of experience
        </p>
      </div>
      <ExperienceList experience={experience} />
    </section>
  );
}
