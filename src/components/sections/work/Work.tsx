import type { Project } from "@/data/projects";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { WorkGallery } from "./WorkGallery";
import styles from "./Work.module.css";

export function Work({
  projects,
  headingLevel,
  viewAllHref,
}: {
  projects: readonly Project[];
  headingLevel: 1 | 2;
  viewAllHref?: string;
}) {
  const projectHeadingLevel = headingLevel === 1 ? 2 : 3;

  return (
    <section aria-labelledby="work" className={styles.section}>
      <SectionHeading id="work" level={headingLevel} watermark="PORTFOLIO">
        / SELECTED WORK
      </SectionHeading>
      <WorkGallery
        projects={projects}
        projectHeadingLevel={projectHeadingLevel}
        viewAllHref={viewAllHref}
      />
    </section>
  );
}
