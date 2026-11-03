import { Fragment } from "react";
import { MoveUpRight } from "lucide-react";
import type { Testimonial } from "@/data/testimonials";
import styles from "./TestimonialQuote.module.css";

export function TestimonialQuote({
  testimonial,
  isActive,
  isEnhanced,
  animate,
}: {
  testimonial: Testimonial;
  isActive: boolean;
  isEnhanced: boolean;
  animate: boolean;
}) {
  const paragraphs = testimonial.quotation.split("\n\n");
  let wordIndex = 0;

  return (
    <figure
      className={styles.figure}
      data-testimonial={testimonial.id}
      data-active={isActive}
      data-enhanced={isEnhanced}
      data-animate={animate}
      aria-hidden={!isActive}
      inert={!isActive}
    >
      <div className={styles.mark} aria-hidden="true">
        “
      </div>
      <blockquote className={styles.quote}>
        {paragraphs.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex}>
            {paragraph.split(" ").map((word, index, words) => (
              <Fragment key={index}>
                <span data-word-index={wordIndex++}>{word}</span>
                {index < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </p>
        ))}
      </blockquote>
      <figcaption className={styles.attribution}>
        <span className={styles.avatar} aria-hidden="true">
          {testimonial.initials}
        </span>
        <div className={styles.identity}>
          <a
            href={testimonial.source}
            target="_blank"
            rel="noopener noreferrer"
          >
            {testimonial.author}
            <MoveUpRight size={14} strokeWidth={2} aria-hidden="true" />
          </a>
          <span className={styles.role}>{testimonial.role}</span>
        </div>
      </figcaption>
    </figure>
  );
}
