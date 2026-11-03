import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistantPhase } from "@/types/assistant";

export function useAssistantSurface(messageCount: number) {
  const [phase, setPhase] = useState<AssistantPhase>("closed");
  const phaseRef = useRef<AssistantPhase>("closed");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [messageBaseline, setMessageBaseline] = useState(0);
  const [animateWelcome, setAnimateWelcome] = useState(false);
  const hasOpened = useRef(false);

  const changePhase = useCallback((next: AssistantPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  function requestOpen() {
    if (phaseRef.current !== "closed") {
      return;
    }
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setMessageBaseline(messageCount);
    setAnimateWelcome(!hasOpened.current && !reduced);
    hasOpened.current = true;
    changePhase(reduced ? "open" : "opening");
  }

  function requestClose() {
    if (phaseRef.current === "closed" || phaseRef.current === "closing") {
      return;
    }
    closeRef.current?.focus({ preventScroll: true });
    if (element) {
      const appearance = getComputedStyle(element);
      const transform = new DOMMatrixReadOnly(appearance.transform);
      element.style.setProperty("--exit-opacity", appearance.opacity);
      element.style.setProperty("--exit-y", `${transform.m42}px`);
      element.style.setProperty("--exit-end-y", `${transform.m42 + 8}px`);
    }
    changePhase(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "closed"
        : "closing",
    );
  }

  function handleCloseAutoFocus(event: Event) {
    event.preventDefault();
    if (phaseRef.current === "closed") {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }

  useEffect(() => {
    if (!element || (phase !== "opening" && phase !== "closing")) {
      return;
    }
    let current = true;
    const animations = element
      .getAnimations()
      .filter(
        (animation) =>
          (animation.effect as KeyframeEffect | null)?.target === element,
      );
    void Promise.allSettled(
      animations.map((animation) => animation.finished),
    ).then(() => {
      if (current && phaseRef.current === phase) {
        changePhase(phase === "opening" ? "open" : "closed");
      }
    });
    return () => {
      current = false;
    };
  }, [element, phase, changePhase]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function handleChange() {
      setMessageBaseline(messageCount);
      setAnimateWelcome(false);
      if (media.matches && phaseRef.current === "opening") {
        changePhase("open");
      } else if (media.matches && phaseRef.current === "closing") {
        changePhase("closed");
      }
    }
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [messageCount, changePhase]);

  return {
    phase,
    triggerRef,
    closeRef,
    element,
    handleContentMount: setElement,
    requestOpen,
    requestClose,
    handleCloseAutoFocus,
    messageBaseline,
    animateWelcome,
  };
}
