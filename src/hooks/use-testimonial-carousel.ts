import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useTestimonialCarousel(count: number) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const isEnhanced = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  useLayoutEffect(() => {
    const stage = stageRef.current!;
    const figures = Array.from(stage.querySelectorAll<HTMLElement>("figure"));
    const selected = figures[activeIndex];
    let isActive = true;

    function synchronizeHeight() {
      if (isActive) {
        stage.style.setProperty(
          "--testimonial-height",
          getComputedStyle(selected).height,
        );
      }
    }

    synchronizeHeight();
    const observer = new ResizeObserver(synchronizeHeight);
    figures.forEach((figure) => observer.observe(figure));
    window.addEventListener("resize", synchronizeHeight);
    document.fonts.addEventListener("loadingdone", synchronizeHeight);
    void document.fonts.ready.then(synchronizeHeight);

    return () => {
      isActive = false;
      observer.disconnect();
      window.removeEventListener("resize", synchronizeHeight);
      document.fonts.removeEventListener("loadingdone", synchronizeHeight);
    };
  }, [activeIndex, isEnhanced]);

  function select(direction: number, control: HTMLButtonElement) {
    control.focus({ preventScroll: true });
    setHasInteracted(true);
    setActiveIndex((current) => (current + direction + count) % count);
  }

  return {
    carouselRef,
    stageRef,
    activeIndex,
    isEnhanced,
    hasInteracted,
    select,
  };
}
