import { useLayoutEffect, useRef, type RefObject } from "react";

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

// Offset layout excludes the carousel's translation and entrance animation.
function documentTop(element: HTMLElement) {
  let top = 0;
  let current: HTMLElement | null = element;
  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return top;
}

export function useTestimonialScroll(
  stageRef: RefObject<HTMLDivElement | null>,
  activeIndex: number,
  isEnhanced: boolean,
) {
  const progress = useRef(0);
  const previousQuote = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!isEnhanced) {
      return;
    }
    const stage = stageRef.current!;
    const section = stage.closest("section")!;
    const figure = stage.querySelectorAll<HTMLElement>("figure")[activeIndex];
    const quote = figure.querySelector<HTMLElement>("blockquote")!;
    const words = Array.from(
      quote.querySelectorAll<HTMLElement>("[data-word-index]"),
    );
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let pendingFrame: number | null = null;
    let isActive = true;

    function measureLayout() {
      // Used CSS heights exclude translation and viewport-coordinate rounding.
      return {
        top: documentTop(quote),
        height: parseFloat(getComputedStyle(quote).height),
        viewport: window.innerHeight,
      };
    }

    let layout = measureLayout();
    let intervalLength = layout.height + 0.4 * layout.viewport;
    let intervalStart = layout.top - 0.75 * layout.viewport;
    if (previousQuote.current && previousQuote.current !== quote) {
      intervalStart = window.scrollY - progress.current * intervalLength;
    } else {
      progress.current = clamp(
        (window.scrollY - intervalStart) / intervalLength,
      );
    }
    previousQuote.current = quote;
    let previousPosition = window.scrollY;
    let previousLimit =
      document.documentElement.scrollHeight - window.innerHeight;

    function hasLayoutChanged(next: typeof layout) {
      return (
        next.top !== layout.top ||
        next.height !== layout.height ||
        next.viewport !== layout.viewport
      );
    }

    function synchronizeLayout(next: typeof layout) {
      const position = window.scrollY;
      const previousEnd = intervalStart + intervalLength;
      const nextLength = next.height + 0.4 * next.viewport;
      const topChange = next.top - layout.top;
      const viewportChange = next.viewport - layout.viewport;

      if (progress.current === 0 && position < intervalStart) {
        // Keep the approach to the quote; a resize at page top must not start reading.
        intervalStart = Math.max(
          position,
          intervalStart + topChange - 0.75 * viewportChange,
        );
      } else if (progress.current === 1 && position > previousEnd) {
        const nextEnd =
          previousEnd +
          topChange +
          next.height -
          layout.height -
          0.35 * viewportChange;
        intervalStart = Math.min(position, nextEnd) - nextLength;
      } else {
        intervalStart = position - progress.current * nextLength;
      }
      layout = next;
      intervalLength = nextLength;
    }

    function paintWords() {
      for (const [index, word] of words.entries()) {
        const fraction = reducedMotion.matches
          ? 1
          : clamp(progress.current * words.length - index);
        const value = String(fraction);
        if (word.style.getPropertyValue("--word-read") !== value) {
          word.style.setProperty("--word-read", value);
        }
      }
    }

    function updateReading() {
      pendingFrame = null;
      if (!isActive) {
        return;
      }
      const next = measureLayout();
      const position = window.scrollY;
      const nextLimit =
        document.documentElement.scrollHeight - window.innerHeight;
      if (hasLayoutChanged(next)) {
        // Only settled quote/viewport geometry changes the reading interval.
        synchronizeLayout(next);
      } else if (
        Math.abs(position - nextLimit) <= 1 &&
        (previousPosition > nextLimit ||
          (nextLimit !== previousLimit &&
            Math.abs(previousPosition - previousLimit) <= 1))
      ) {
        // Browsers clamp or pin the viewport to a changing document end.
        intervalStart = position - progress.current * intervalLength;
      } else {
        progress.current = clamp((position - intervalStart) / intervalLength);
      }
      previousPosition = position;
      previousLimit = nextLimit;
      paintWords();
    }

    function scheduleUpdate() {
      if (isActive && pendingFrame === null) {
        pendingFrame = requestAnimationFrame(updateReading);
      }
    }

    paintWords();
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(quote);
    observer.observe(stage);
    let preceding = section.previousElementSibling;
    while (preceding) {
      observer.observe(preceding);
      preceding = preceding.previousElementSibling;
    }
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    document.fonts.addEventListener("loadingdone", scheduleUpdate);
    reducedMotion.addEventListener("change", scheduleUpdate);
    void document.fonts.ready.then(scheduleUpdate);

    return () => {
      // Retain synchronized progress; selection mutations can move the viewport.
      isActive = false;
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.fonts.removeEventListener("loadingdone", scheduleUpdate);
      reducedMotion.removeEventListener("change", scheduleUpdate);
      if (pendingFrame !== null) {
        cancelAnimationFrame(pendingFrame);
      }
    };
  }, [stageRef, activeIndex, isEnhanced]);
}
