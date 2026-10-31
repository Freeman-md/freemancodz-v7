import { MoveUpRight } from "lucide-react";
import type { Project } from "@/data/projects";
import { ProjectArtwork } from "./ProjectArtwork";
import styles from "./ProjectCard.module.css";

export function ProjectCard({
  project,
  headingLevel,
}: {
  project: Project;
  headingLevel: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <a
      href={project.href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
      aria-labelledby={`project-${project.id}`}
    >
      <div className={styles.visual}>
        <ProjectArtwork project={project} />
        <span className={styles.classification}>
          {project.category === "Real projects"
            ? "Real project"
            : "Exploration"}
        </span>
        <span className={styles.arrow} aria-hidden="true">
          <MoveUpRight size={16} strokeWidth={2} />
        </span>
      </div>
      <div className={styles.metadata}>
        <Heading id={`project-${project.id}`} className={styles.heading}>
          <span>{project.title}</span>
          <span className={styles.description}>— {project.description}</span>
        </Heading>
        <ul className={styles.tags} aria-label="Project tags">
          {project.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
    </a>
  );
}
