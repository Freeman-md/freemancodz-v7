import { useLayoutEffect, useRef, type RefObject } from "react";

export function useServicesReveal(listRef: RefObject<HTMLDivElement | null>) {
  const revealed = useRef(new Set<HTMLElement>());
  const headingStartedAt = useRef<number | null>(null);

  useLayoutEffect(() => {
    const section = listRef.current!.closest("section")!;
    if (!("IntersectionObserver" in window)) {
      return;
    }
    const headingGroup = section.querySelector<HTMLElement>(
      "[data-section-heading]",
    )!;
    const headingParts = Array.from(
      headingGroup.querySelectorAll<HTMLElement>("[data-section-part]"),
    );
    const rows = Array.from(
      section.querySelectorAll<HTMLElement>("[data-service-row]"),
    );
    const elements = [...headingParts, ...rows];
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const styles = getComputedStyle(section);
    const rowDelay = Number(styles.getPropertyValue("--service-row-delay"));
    const rowStagger = Number(styles.getPropertyValue("--service-row-stagger"));

    function complete(element: HTMLElement) {
      revealed.current.add(element);
      element.dataset.serviceState = "complete";
    }

    function reveal(element: HTMLElement, delay = 0) {
      if (revealed.current.has(element)) {
        return;
      }
      revealed.current.add(element);
      element.style.setProperty("--service-delay", `${delay}ms`);
      element.dataset.serviceState = "active";
    }

    section.setAttribute("data-services-reveal", "");
    for (const element of elements) {
      if (reducedMotion.matches || revealed.current.has(element)) {
        complete(element);
      } else {
        element.dataset.serviceState = "pending";
      }
    }
    if (headingGroup.getBoundingClientRect().bottom <= 0) {
      headingParts.forEach(complete);
    }

    const observer = new IntersectionObserver((entries) => {
      const headingEntered = entries.some(
        (entry) => entry.target === headingGroup && entry.isIntersecting,
      );
      if (
        headingEntered &&
        !headingParts.every((part) => revealed.current.has(part))
      ) {
        headingStartedAt.current = performance.now();
        headingParts.forEach((part) => reveal(part));
      }
      const visibleRows = entries.filter(
        (entry) => entry.isIntersecting && entry.target !== headingGroup,
      );
      if (
        visibleRows.length &&
        headingGroup.getBoundingClientRect().bottom <= 0
      ) {
        headingParts.forEach(complete);
      }
      for (const [index, entry] of visibleRows.entries()) {
        const remainingDelay =
          headingStartedAt.current === null
            ? 0
            : Math.max(
                0,
                rowDelay - (performance.now() - headingStartedAt.current),
              );
        reveal(
          entry.target as HTMLElement,
          remainingDelay + index * rowStagger,
        );
        observer.unobserve(entry.target);
      }
    });
    observer.observe(headingGroup);
    rows.forEach((row) => observer.observe(row));

    function revealFocusedContext(event: Event) {
      const target = event.target as HTMLElement;
      headingParts.forEach(complete);
      const row = target.closest<HTMLElement>("[data-service-row]");
      if (row) {
        complete(row);
      }
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
      observer.disconnect();
      section.removeEventListener("focusin", revealFocusedContext);
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [listRef]);
}
