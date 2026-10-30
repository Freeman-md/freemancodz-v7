"use client";

import { useEffect, useRef } from "react";
import { navigationBreakpoint } from "@/config/navigation";

export function useHeroScroll(heroId: string) {
  const portraitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const portrait = portraitRef.current;

    if (!hero || !portrait) {
      throw new Error(`Hero scroll target #${heroId} is missing`);
    }

    const desktop = window.matchMedia(navigationBreakpoint);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pendingFrame: number | null = null;
    let heroStart = hero.getBoundingClientRect().top + window.scrollY;

    function updatePortrait() {
      pendingFrame = null;
      const distance = desktop.matches ? 600 : 300;
      const progress = Math.min(
        1,
        Math.max(0, (window.scrollY - heroStart) / distance),
      );
      const enlargement = desktop.matches ? 0.15 : 0.08;
      const scale = reducedMotion.matches ? 1 : 1 + enlargement * progress;
      const illumination = reducedMotion.matches ? 1 : 0.55 + 0.45 * progress;

      portrait!.style.setProperty("--portrait-scale", String(scale));
      portrait!.style.setProperty(
        "--portrait-illumination",
        String(illumination),
      );

      // Once bypassed, the entrance stays complete even if motion is re-enabled.
      if (reducedMotion.matches) {
        hero!.dataset.entranceComplete = "true";
      }
    }

    function scheduleUpdate() {
      if (pendingFrame === null) {
        pendingFrame = window.requestAnimationFrame(updatePortrait);
      }
    }

    function synchronizeLayout() {
      heroStart = hero!.getBoundingClientRect().top + window.scrollY;
      scheduleUpdate();
    }

    updatePortrait();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", synchronizeLayout);
    desktop.addEventListener("change", synchronizeLayout);
    reducedMotion.addEventListener("change", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", synchronizeLayout);
      desktop.removeEventListener("change", synchronizeLayout);
      reducedMotion.removeEventListener("change", scheduleUpdate);
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }
    };
  }, [heroId]);

  return portraitRef;
}
