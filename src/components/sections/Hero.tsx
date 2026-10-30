import { ActionLink } from "@/components/shared/ActionLink";
import { HeroPortrait } from "./HeroPortrait";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section
      id="top"
      tabIndex={-1}
      aria-labelledby="hero-heading"
      className={styles.hero}
    >
      <div className={styles.introduction}>
        <h1 id="hero-heading" className={styles.headline}>
          <span className={styles.firstLine}>
            From first click.
            <span aria-hidden="true" className={styles.caret} />
          </span>{" "}
          <span className={styles.secondLine}>To a job well done.</span>
        </h1>
        <p className={styles.description}>
          I build intuitive interfaces and reliable workflows that simplify your
          business operations, using AI where it helps.
        </p>
        <div className={styles.action}>
          <ActionLink href="/#work">Explore my work</ActionLink>
        </div>
      </div>
      <HeroPortrait heroId="top" />
      <div className={styles.labels}>
        <p className={styles.identity}>
          <span>Freeman Madudili</span>
          <span>Software Engineer</span>
        </p>
        <p className={styles.signoff}>
          <span>Customer-facing products</span>
          <span>Connected to what happens next</span>
        </p>
      </div>
    </section>
  );
}
