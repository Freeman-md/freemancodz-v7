import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useTestimonialCarousel(count: number) {
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
    const selected = stage.querySelectorAll<HTMLElement>("figure")[activeIndex];
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
    observer.observe(selected);

    return () => {
      isActive = false;
      observer.disconnect();
    };
  }, [activeIndex, isEnhanced]);

  function select(direction: number, control: HTMLButtonElement) {
    control.focus({ preventScroll: true });
    setHasInteracted(true);
    setActiveIndex((current) => (current + direction + count) % count);
  }

  return {
    stageRef,
    activeIndex,
    isEnhanced,
    hasInteracted,
    select,
  };
}
