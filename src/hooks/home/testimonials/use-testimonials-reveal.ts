import { useLayoutEffect, useRef, type RefObject } from "react";

export function useTestimonialsReveal(
  carouselRef: RefObject<HTMLDivElement | null>,
) {
  const completed = useRef(new Set<HTMLElement>());

  useLayoutEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return;
    }
    const section = carouselRef.current!.closest("section")!;
    const headingGroup = section.querySelector<HTMLElement>(
      "[data-section-heading]",
    )!;
    const headingParts = Array.from(
      section.querySelectorAll<HTMLElement>("[data-section-part]"),
    );
    const groups = Array.from(
      section.querySelectorAll<HTMLElement>("[data-testimonial-entrance]"),
    );
    const elements = [...headingParts, ...groups];
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let isActive = true;
    let startedAt: number | null = null;

    function complete(element: HTMLElement) {
      completed.current.add(element);
      element.dataset.testimonialEntranceState = "complete";
    }

    function reveal(element: HTMLElement, delay = 0) {
      if (completed.current.has(element)) {
        return;
      }
      completed.current.add(element);
      element.style.setProperty("--testimonial-entrance-delay", `${delay}ms`);
      element.dataset.testimonialEntranceState = "active";
    }

    section.setAttribute("data-testimonials-reveal", "");
    for (const element of elements) {
      if (
        reducedMotion.matches ||
        completed.current.has(element) ||
        section.contains(document.activeElement)
      ) {
        complete(element);
      } else {
        element.dataset.testimonialEntranceState = "pending";
      }
    }
    function settlePassedContent() {
      if (headingGroup.getBoundingClientRect().bottom <= 0) {
        headingParts.forEach(complete);
      }
      groups
        .filter((group) => group.getBoundingClientRect().bottom <= 0)
        .forEach(complete);
    }
    settlePassedContent();

    const styles = getComputedStyle(section);
    const observer = new IntersectionObserver((entries) => {
      if (!isActive || reducedMotion.matches) {
        return;
      }
      settlePassedContent();
      if (
        entries.some(
          (entry) => entry.target === headingGroup && entry.isIntersecting,
        ) &&
        !headingParts.every((part) => completed.current.has(part))
      ) {
        startedAt = performance.now();
        headingParts.forEach((part) => reveal(part));
      }
      for (const entry of entries) {
        if (entry.target === headingGroup || !entry.isIntersecting) {
          continue;
        }
        if (headingGroup.getBoundingClientRect().bottom <= 0) {
          headingParts.forEach(complete);
        }
        const group = entry.target as HTMLElement;
        const stageDelay = Number(
          styles.getPropertyValue(
            `--testimonial-${group.dataset.testimonialEntrance}-delay`,
          ),
        );
        const remaining =
          startedAt === null
            ? 0
            : Math.max(0, stageDelay - (performance.now() - startedAt));
        reveal(group, remaining);
        observer.unobserve(group);
      }
    });

    if (!reducedMotion.matches) {
      observer.observe(headingGroup);
      groups.forEach((group) => observer.observe(group));
    }
    function revealFocusedContext() {
      elements.forEach(complete);
    }
    function handleMotionChange() {
      if (reducedMotion.matches) {
        elements.forEach(complete);
        observer.disconnect();
      }
    }

    section.addEventListener("focusin", revealFocusedContext);
    reducedMotion.addEventListener("change", handleMotionChange);
    return () => {
      isActive = false;
      observer.disconnect();
      section.removeEventListener("focusin", revealFocusedContext);
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [carouselRef]);
}
