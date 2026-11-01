import { useLayoutEffect, useRef, type RefObject } from "react";

export function useExperienceReveal(
  listRef: RefObject<HTMLUListElement | null>,
) {
  const revealed = useRef(new Set<HTMLElement>());

  useLayoutEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return;
    }
    const section = listRef.current!.closest("section")!;
    const headingGroup = section.querySelector<HTMLElement>(
      "[data-section-heading]",
    )!;
    const heading = section.querySelector<HTMLHeadingElement>("h2")!;
    const introduction = [
      ...section.querySelectorAll<HTMLElement>("[data-section-part]"),
      section.querySelector<HTMLElement>("[data-experience-summary]")!,
    ];
    const rows = Array.from(listRef.current!.children) as HTMLElement[];
    const elements = [...introduction, ...rows];
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const styles = getComputedStyle(section);
    const rowDelay = Number(styles.getPropertyValue("--experience-row-delay"));
    const rowStagger = Number(
      styles.getPropertyValue("--experience-row-stagger"),
    );
    let entranceStartedAt: number | null = null;
    let isActive = true;

    function complete(element: HTMLElement) {
      revealed.current.add(element);
      element.dataset.experienceState = "complete";
    }

    function reveal(element: HTMLElement, delay = 0) {
      if (revealed.current.has(element)) {
        return;
      }
      revealed.current.add(element);
      element.style.setProperty("--experience-delay", `${delay}ms`);
      element.dataset.experienceState = "active";
    }

    section.setAttribute("data-experience-reveal", "");
    for (const element of elements) {
      if (reducedMotion.matches || revealed.current.has(element)) {
        complete(element);
      } else {
        element.dataset.experienceState = "pending";
      }
    }
    if (
      headingGroup.getBoundingClientRect().bottom <= 0 ||
      document.activeElement === heading
    ) {
      introduction.forEach(complete);
    }

    const observer = new IntersectionObserver((entries) => {
      if (!isActive || reducedMotion.matches) {
        return;
      }
      if (
        entries.some(
          (entry) => entry.target === headingGroup && entry.isIntersecting,
        ) &&
        !introduction.every((element) => revealed.current.has(element))
      ) {
        entranceStartedAt = performance.now();
        introduction.forEach((element) => reveal(element));
      }
      const visibleRows = entries.filter(
        (entry) =>
          entry.isIntersecting &&
          entry.target !== headingGroup &&
          !revealed.current.has(entry.target as HTMLElement),
      );
      if (
        visibleRows.length &&
        headingGroup.getBoundingClientRect().bottom <= 0
      ) {
        introduction.forEach(complete);
      }
      const remainingDelay =
        entranceStartedAt === null
          ? 0
          : Math.max(0, rowDelay - (performance.now() - entranceStartedAt));
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

    function revealFocusedContext() {
      if (document.activeElement === heading) {
        introduction.forEach(complete);
        entranceStartedAt = null;
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
  }, [listRef]);
}
