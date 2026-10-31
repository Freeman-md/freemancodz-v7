import { Work } from "@/components/sections/work/Work";
import { selectedProjects } from "@/data/projects";
import { Hero } from "@/components/sections/hero/Hero";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <Hero />
      <Work projects={selectedProjects} headingLevel={2} viewAllHref="/work" />
      <section className={styles.section} aria-labelledby="experience">
        <h2 id="experience" tabIndex={-1} className={styles.title}>
          Experience
        </h2>
      </section>
      <section className={styles.section} aria-labelledby="contact">
        <h2 id="contact" tabIndex={-1} className={styles.title}>
          Contact
        </h2>
      </section>
    </main>
  );
}
