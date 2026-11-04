import { useEffect, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const media = window.matchMedia("(min-width: 64rem)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useAssistantViewport(element: HTMLDivElement | null) {
  const isDesktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 64rem)").matches,
    () => false,
  );

  useEffect(() => {
    if (!element) {
      return;
    }
    function measure() {
      const viewport = window.visualViewport;
      element!.style.setProperty(
        "--viewport-height",
        `${viewport?.height ?? window.innerHeight}px`,
      );
      element!.style.setProperty(
        "--viewport-width",
        `${viewport?.width ?? window.innerWidth}px`,
      );
      element!.style.setProperty(
        "--viewport-top",
        `${viewport?.offsetTop ?? 0}px`,
      );
      element!.style.setProperty(
        "--viewport-left",
        `${viewport?.offsetLeft ?? 0}px`,
      );
    }
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, [element]);

  return isDesktop;
}
