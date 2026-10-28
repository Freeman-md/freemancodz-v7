import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { MouseEvent } from "react";
import { navigationBreakpoint } from "@/config/navigation";
import { followAnchor } from "@/lib/navigation/anchor-navigation";
import {
  captureExitAppearance,
  observeAnimationCompletion,
} from "@/lib/navigation/animation-completion";
import { getRevealGeometry } from "@/lib/navigation/reveal-geometry";

type NavigationPhase = "closed" | "opening" | "open" | "closing";

export function useMobileNavigation() {
  const [phase, setPhase] = useState<NavigationPhase>("closed");
  const phaseRef = useRef<NavigationPhase>("closed");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(
    null,
  );

  const surfaceRef = useRef<HTMLDivElement>(null);
  const pendingDestination = useRef<string | null>(null);
  const restoreDesktopFocus = useRef(false);

  const handleContentMount = useCallback((element: HTMLDivElement | null) => {
    setContentElement(element);
  }, []);

  const changePhase = useCallback((nextPhase: NavigationPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const requestClose = useCallback(() => {
    if (phaseRef.current === "closed" || phaseRef.current === "closing") {
      return;
    }

    closeRef.current?.focus({ preventScroll: true });
    if (surfaceRef.current) {
      captureExitAppearance(surfaceRef.current, closeRef.current);
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    changePhase(reduceMotion ? "closed" : "closing");
  }, [changePhase]);

  function requestOpen() {
    if (
      phaseRef.current !== "closed" ||
      window.matchMedia(navigationBreakpoint).matches
    ) {
      return;
    }

    pendingDestination.current = null;
    restoreDesktopFocus.current = false;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    changePhase(reduceMotion ? "open" : "opening");
  }

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    pendingDestination.current = event.currentTarget.getAttribute("href");
    requestClose();
  }

  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    if (phaseRef.current !== "closed") {
      return;
    }

    const destination = pendingDestination.current;
    pendingDestination.current = null;

    // Radix calls this after unmounting its focus scope and releasing modal restrictions.
    if (restoreDesktopFocus.current) {
      restoreDesktopFocus.current = false;
      document
        .querySelector<HTMLElement>('[data-site-header="desktop"] a')
        ?.focus();
    } else if (destination) {
      followAnchor(destination);
    } else {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }

  useLayoutEffect(() => {
    if (phase === "closed") {
      return;
    }

    function updateGeometry() {
      const button = closeRef.current ?? triggerRef.current;
      const content = contentElement;
      if (!button || !content) {
        return;
      }

      const geometry = getRevealGeometry(button.getBoundingClientRect(), {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      content.style.setProperty("--reveal-x", `${geometry.centerX}px`);
      content.style.setProperty("--reveal-y", `${geometry.centerY}px`);
      content.style.setProperty("--reveal-radius", `${geometry.radius}px`);
    }

    updateGeometry();
    window.addEventListener("resize", updateGeometry);
    window.visualViewport?.addEventListener("resize", updateGeometry);
    return () => {
      window.removeEventListener("resize", updateGeometry);
      window.visualViewport?.removeEventListener("resize", updateGeometry);
    };
  }, [phase, contentElement]);

  useEffect(() => {
    if (phase !== "opening" && phase !== "closing") {
      return;
    }

    const content = contentElement;
    if (!content) {
      return;
    }

    const observer = new AbortController();
    void observeAnimationCompletion(content, observer.signal).then(
      (completed) => {
        if (completed && phaseRef.current === phase) {
          changePhase(phase === "opening" ? "open" : "closed");
        }
      },
    );
    return () => observer.abort();
  }, [phase, contentElement, changePhase]);

  useEffect(() => {
    const desktop = window.matchMedia(navigationBreakpoint);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function handleBreakpointChange() {
      if (desktop.matches && phaseRef.current !== "closed") {
        restoreDesktopFocus.current = true;
        pendingDestination.current = null;
        changePhase("closed");
      }
    }

    function handleMotionChange() {
      if (!reducedMotion.matches) {
        return;
      }

      if (phaseRef.current === "opening") {
        changePhase("open");
      } else if (phaseRef.current === "closing") {
        changePhase("closed");
      }
    }

    desktop.addEventListener("change", handleBreakpointChange);
    reducedMotion.addEventListener("change", handleMotionChange);
    return () => {
      desktop.removeEventListener("change", handleBreakpointChange);
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [changePhase]);

  return {
    phase,
    triggerRef,
    closeRef,
    handleContentMount,
    surfaceRef,
    requestOpen,
    requestClose,
    handleLinkClick,
    handleCloseAutoFocus,
  };
}
