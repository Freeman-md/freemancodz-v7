import { useLayoutEffect, useRef, type RefObject } from "react";

type FocusPolicy = "section-context" | "heading-context";

export function useSectionReveal(
  listRef: RefObject<HTMLElement | null>,
  { focusPolicy }: { focusPolicy: FocusPolicy },
) {
  const revealed = useRef(new Set<HTMLElement>());
  const entranceStartedAt = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return;
    }

    const list = listRef.current!;
    const section = list.closest("section")!;
    const headingGroup = section.querySelector<HTMLElement>(
      "[data-section-heading]",
    )!;
    const heading = headingGroup.querySelector<HTMLHeadingElement>("h2")!;
    const introduction = Array.from(
      section.querySelectorAll<HTMLElement>(
        "[data-section-part], [data-section-reveal-introduction]",
      ),
    );
    const rows = Array.from(list.children) as HTMLElement[];
    const elements = [...introduction, ...rows];
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const styles = getComputedStyle(section);
    const rowDelay = Number(styles.getPropertyValue("--section-row-delay"));
    const rowStagger = Number(styles.getPropertyValue("--section-row-stagger"));
    let isActive = true;

    function complete(element: HTMLElement) {
      revealed.current.add(element);
      element.dataset.sectionRevealState = "complete";
    }

    function reveal(element: HTMLElement, delay = 0) {
      if (revealed.current.has(element)) {
        return;
      }

      revealed.current.add(element);
      element.style.setProperty("--section-reveal-delay", `${delay}ms`);
      element.dataset.sectionRevealState = "active";
    }

    section.setAttribute("data-section-reveal", "");
    for (const element of elements) {
      if (reducedMotion.matches || revealed.current.has(element)) {
        complete(element);
      } else {
        element.dataset.sectionRevealState = "pending";
      }
    }

    if (
      headingGroup.getBoundingClientRect().bottom <= 0 ||
      (focusPolicy === "heading-context" && document.activeElement === heading)
    ) {
      introduction.forEach(complete);
    }

    const observer = new IntersectionObserver((entries) => {
      if (!isActive || reducedMotion.matches) {
        return;
      }

      const headingEntered = entries.some(
        (entry) => entry.target === headingGroup && entry.isIntersecting,
      );
      if (
        headingEntered &&
        !introduction.every((element) => revealed.current.has(element))
      ) {
        entranceStartedAt.current = performance.now();
        introduction.forEach((element) => reveal(element));
      }

      const visibleRows = entries.filter(
        (entry) => entry.isIntersecting && entry.target !== headingGroup,
      );
      if (
        visibleRows.length &&
        headingGroup.getBoundingClientRect().bottom <= 0
      ) {
        introduction.forEach(complete);
      }

      const remainingDelay =
        entranceStartedAt.current === null
          ? 0
          : Math.max(
              0,
              rowDelay - (performance.now() - entranceStartedAt.current),
            );
      for (const [index, entry] of visibleRows.entries()) {
        reveal(
          entry.target as HTMLElement,
          remainingDelay + index * rowStagger,
        );
        observer.unobserve(entry.target);
      }
    });

    if (!reducedMotion.matches) {
      observer.observe(headingGroup);
      rows.forEach((row) => observer.observe(row));
    }

    function revealFocusedContext(event: Event) {
      if (focusPolicy === "heading-context") {
        if (event.target === heading) {
          introduction.forEach(complete);
          entranceStartedAt.current = null;
        }
        return;
      }

      introduction.forEach(complete);
      const focusedRow = rows.find((row) => row.contains(event.target as Node));
      if (focusedRow) {
        complete(focusedRow);
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
      isActive = false;
      observer.disconnect();
      section.removeEventListener("focusin", revealFocusedContext);
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [listRef, focusPolicy]);
}
