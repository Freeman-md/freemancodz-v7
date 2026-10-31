"use client";

import Link from "next/link";
import { MoveUpRight } from "lucide-react";
import type { Project } from "@/data/projects";
import { useWorkFilter } from "@/hooks/use-work-filter";
import { useWorkReveal } from "@/hooks/use-work-reveal";
import { WorkFilters } from "./WorkFilters";
import { ProjectCard } from "./ProjectCard";
import styles from "./WorkGallery.module.css";

export function WorkGallery({
  projects,
  projectHeadingLevel,
  viewAllHref,
}: {
  projects: readonly Project[];
  projectHeadingLevel: 2 | 3;
  viewAllHref?: string;
}) {
  const {
    selectedFilter,
    filteredProjects,
    selectFilter,
    gridRef,
    galleryRef,
    isEnhanced,
  } = useWorkFilter(projects);
  useWorkReveal(galleryRef, selectedFilter);

  return (
    <div ref={galleryRef}>
      <div className={styles.controls} data-work-reveal="controls">
        <WorkFilters
          selectedFilter={selectedFilter}
          onSelect={selectFilter}
          enabled={isEnhanced}
        />
        {viewAllHref && (
          <Link href={viewAllHref} className={styles.viewAll}>
            View all work
            <span>
              <MoveUpRight size={16} strokeWidth={2} aria-hidden="true" />
            </span>
          </Link>
        )}
      </div>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.status}
      >
        {filteredProjects.length}{" "}
        {filteredProjects.length === 1 ? "project" : "projects"} ·{" "}
        {selectedFilter}
      </p>
      <div ref={gridRef} className={styles.grid}>
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            data-project-id={project.id}
            className={styles.position}
          >
            <div
              data-work-reveal="card"
              data-reveal-id={project.id}
              className={styles.reveal}
            >
              <ProjectCard
                project={project}
                headingLevel={projectHeadingLevel}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
