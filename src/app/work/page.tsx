import type { Metadata } from "next";
import { Work } from "@/components/sections/work/Work";
import { projects } from "@/data/projects";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Selected Work | Freemancodz",
  description:
    "Customer-facing products, connected workflows and interface explorations by Freeman Madudili.",
};

export default function WorkPage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.main}>
      <Work projects={projects} headingLevel={1} />
    </main>
  );
}
