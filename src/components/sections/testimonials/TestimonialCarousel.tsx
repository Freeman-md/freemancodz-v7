"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Testimonial } from "@/data/testimonials";
import { useTestimonialCarousel } from "@/hooks/use-testimonial-carousel";
import { useTestimonialsReveal } from "@/hooks/use-testimonials-reveal";
import { useTestimonialScroll } from "@/hooks/use-testimonial-scroll";
import { TestimonialQuote } from "./TestimonialQuote";
import styles from "./TestimonialCarousel.module.css";

export function TestimonialCarousel({
  testimonials,
}: {
  testimonials: readonly Testimonial[];
}) {
  const {
    carouselRef,
    stageRef,
    activeIndex,
    isEnhanced,
    hasInteracted,
    select,
  } = useTestimonialCarousel(testimonials.length);
  useTestimonialsReveal(carouselRef);
  useTestimonialScroll(stageRef, activeIndex, isEnhanced);
  const selected = testimonials[activeIndex];
  const position = String(activeIndex + 1).padStart(2, "0");
  const total = String(testimonials.length).padStart(2, "0");

  return (
    <div
      ref={carouselRef}
      className={styles.carousel}
      data-testimonials-enhanced={isEnhanced}
      data-animate={hasInteracted}
    >
      <div className={styles.controls} data-testimonial-entrance="controls">
        <button
          type="button"
          aria-label="Previous testimonial"
          disabled={!isEnhanced}
          onClick={(event) => select(-1, event.currentTarget)}
        >
          <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
          Previous
        </button>
        <span className={styles.counter}>
          {position} / {total}
        </span>
        <button
          type="button"
          aria-label="Next testimonial"
          disabled={!isEnhanced}
          onClick={(event) => select(1, event.currentTarget)}
        >
          Next
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <span
        className={styles.status}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isEnhanced
          ? `${selected.author}, testimonial ${activeIndex + 1} of ${testimonials.length}`
          : ""}
      </span>
      <div data-testimonial-entrance="quote">
        <div ref={stageRef} className={styles.stage} data-testimonial-stage>
          {testimonials.map((testimonial, index) => (
            <TestimonialQuote
              key={testimonial.id}
              testimonial={testimonial}
              isActive={!isEnhanced || index === activeIndex}
              isEnhanced={isEnhanced}
              animate={hasInteracted}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
