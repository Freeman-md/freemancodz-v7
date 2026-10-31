import { useLayoutEffect, useRef, type RefObject } from "react";

export function useWorkReveal(
  galleryRef: RefObject<HTMLDivElement | null>,
  selectedFilter: string,
) {
  const completed = useRef(new Set<string>());
  const hasTriggeredHeading = useRef(false);
  const previousFilter = useRef(selectedFilter);

  useLayoutEffect(() => {
    const section = galleryRef.current!.closest("section")!;
    if (!("IntersectionObserver" in window)) {
      return;
    }
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const elements = Array.from(
      section.querySelectorAll<HTMLElement>("[data-work-reveal]"),
    );
    const filterChanged = previousFilter.current !== selectedFilter;
    previousFilter.current = selectedFilter;
    const cards = elements.filter(
      (element) => element.dataset.workReveal === "card",
    );
    const headingGroup = section.querySelector<HTMLElement>(
      "[data-work-heading]",
    )!;
    const headerElements = elements.filter(
      (element) => element.dataset.workReveal !== "card",
    );
    const keyFor = (element: HTMLElement) =>
      element.dataset.revealId ?? element.dataset.workReveal!;

    function complete(element: HTMLElement) {
      completed.current.add(keyFor(element));
      element.dataset.revealState = "complete";
    }

    function reveal(element: HTMLElement, delay: number) {
      if (completed.current.has(keyFor(element))) {
        complete(element);
        return;
      }
      // An interrupted entrance is also considered revealed; never replay it.
      completed.current.add(keyFor(element));
      element.style.setProperty("--reveal-delay", `${delay}ms`);
      element.dataset.revealState = "active";
    }

    function inViewport(element: HTMLElement) {
      const bounds = element.getBoundingClientRect();
      return bounds.bottom > 0 && bounds.top < innerHeight;
    }

    section.setAttribute("data-work-enhanced", "");
    for (const element of elements) {
      if (
        reducedMotion.matches ||
        completed.current.has(keyFor(element)) ||
        element.contains(document.activeElement) ||
        (filterChanged && inViewport(element))
      ) {
        complete(element);
      } else {
        element.dataset.revealState = "pending";
      }
    }

    const observer = new IntersectionObserver((entries) => {
      let cardIndex = 0;
      const headingEntered = entries.some(
        (entry) => entry.target === headingGroup && entry.isIntersecting,
      );
      if (headingEntered && !hasTriggeredHeading.current) {
        hasTriggeredHeading.current = true;
        for (const element of headerElements) {
          reveal(element, 0);
        }
      }
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.target === headingGroup) {
          continue;
        }
        const card = entry.target as HTMLElement;
        if (!completed.current.has(keyFor(card))) {
          reveal(card, (headingEntered ? 400 : 0) + cardIndex * 60);
          cardIndex += 1;
        }
        observer.unobserve(card);
      }
    });

    if (!hasTriggeredHeading.current) {
      observer.observe(headingGroup);
    }
    for (const card of cards) {
      if (!completed.current.has(keyFor(card))) {
        observer.observe(card);
      }
    }

    function handleFocus(event: Event) {
      const target = event.target as HTMLElement;
      const card = target.closest<HTMLElement>("[data-work-reveal='card']");
      if (card) {
        complete(card);
      }
      if (target.id === "work") {
        hasTriggeredHeading.current = true;
        headerElements.forEach(complete);
      }
    }

    function handleMotionChange() {
      if (reducedMotion.matches) {
        hasTriggeredHeading.current = true;
        elements.forEach(complete);
        observer.disconnect();
      }
    }

    section.addEventListener("focusin", handleFocus);
    reducedMotion.addEventListener("change", handleMotionChange);
    return () => {
      observer.disconnect();
      section.removeEventListener("focusin", handleFocus);
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [galleryRef, selectedFilter]);
}
