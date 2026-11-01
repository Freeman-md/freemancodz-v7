"use client";

import { useRef } from "react";
import type { ExperienceRecord } from "@/data/experience";
import { useExperienceReveal } from "@/hooks/use-experience-reveal";
import styles from "./ExperienceList.module.css";

export function ExperienceList({
  experience,
}: {
  experience: readonly ExperienceRecord[];
}) {
  const listRef = useRef<HTMLUListElement>(null);
  useExperienceReveal(listRef);

  return (
    <ul ref={listRef} className={styles.list} role="list">
      {experience.map((record) => (
        <li
          key={record.id}
          className={styles.row}
          data-experience-row={record.id}
        >
          <h3 className={styles.company}>{record.company}</h3>
          <div className={styles.details}>
            <span className={styles.role}>{record.role}</span>
            <span className={styles.dates}>{record.dates}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
