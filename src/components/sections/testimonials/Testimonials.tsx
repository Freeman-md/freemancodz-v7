import { SectionHeading } from "@/components/shared/SectionHeading";
import { testimonials } from "@/data/testimonials";
import { TestimonialCarousel } from "./TestimonialCarousel";
import styles from "./Testimonials.module.css";

export function Testimonials() {
  return (
    <section aria-labelledby="testimonials" className={styles.section}>
      <SectionHeading
        id="testimonials"
        level={2}
        watermark="TESTIMONIALS"
        className={styles.heading}
      >
        / THEIR WORDS
      </SectionHeading>
      <TestimonialCarousel testimonials={testimonials} />
    </section>
  );
}
