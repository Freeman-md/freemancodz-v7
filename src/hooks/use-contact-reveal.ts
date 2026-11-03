import { useLayoutEffect, useRef, type RefObject } from "react";

export function useContactReveal(groupRef: RefObject<HTMLDivElement | null>) {
  const hasRevealed = useRef(false);

  useLayoutEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return;
    }

    const section = groupRef.current!.closest("section")!;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let isActive = true;

    function complete() {
      hasRevealed.current = true;
      section.dataset.contactState = "complete";
    }

    const observer = new IntersectionObserver((entries) => {
      if (
        !isActive ||
        hasRevealed.current ||
        !entries.some((entry) => entry.isIntersecting)
      ) {
        return;
      }
      if (section.getBoundingClientRect().top < 0 || reducedMotion.matches) {
        complete();
      } else {
        hasRevealed.current = true;
        section.dataset.contactState = "active";
      }
      observer.disconnect();
    });

    if (
      hasRevealed.current ||
      reducedMotion.matches ||
      section.contains(document.activeElement) ||
      section.getBoundingClientRect().top < 0
    ) {
      complete();
    } else {
      section.dataset.contactState = "pending";
      observer.observe(section);
    }

    function revealFocusedContext() {
      complete();
      observer.disconnect();
    }

    function handleMotionChange() {
      if (reducedMotion.matches) {
        revealFocusedContext();
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
  }, [groupRef]);
}
