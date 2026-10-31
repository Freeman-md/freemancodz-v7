import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type RefObject,
} from "react";
import type { ServiceId } from "@/data/services";

const subscribe = () => () => {};

export function useServiceDisclosure(
  listRef: RefObject<HTMLDivElement | null>,
) {
  const isEnhanced = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [selectedService, setSelectedService] = useState<ServiceId | null>(
    "web-development",
  );
  const [hasInteracted, setHasInteracted] = useState(false);
  const selectedServiceRef = useRef<ServiceId | null>("web-development");
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialAnchor = useRef<{ element: HTMLElement; top: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!isEnhanced) {
      const target = document.getElementById(location.hash.slice(1));
      const section = listRef.current!.closest("section")!;
      if (
        target &&
        (section.compareDocumentPosition(target) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
          0
      ) {
        initialAnchor.current = {
          element: target,
          top: target.getBoundingClientRect().top,
        };
      }
      return;
    }
    const anchor = initialAnchor.current;
    if (anchor) {
      // Collapsing the static fallback must preserve an existing destination's header clearance.
      window.scrollBy({
        top: anchor.element.getBoundingClientRect().top - anchor.top,
        behavior: "instant",
      });
      initialAnchor.current = null;
    }
  }, [isEnhanced, listRef]);

  function cancelHover() {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }

  function toggleService(serviceId: ServiceId) {
    cancelHover();
    const nextService =
      selectedServiceRef.current === serviceId ? null : serviceId;
    selectedServiceRef.current = nextService;
    setHasInteracted(true);
    setSelectedService(nextService);
  }

  function scheduleHover(
    serviceId: ServiceId,
    event: PointerEvent<HTMLElement>,
  ) {
    cancelHover();
    if (
      !isEnhanced ||
      event.pointerType !== "mouse" ||
      !matchMedia("(hover: hover) and (pointer: fine)").matches ||
      selectedServiceRef.current === serviceId
    ) {
      return;
    }

    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      selectedServiceRef.current = serviceId;
      setHasInteracted(true);
      setSelectedService(serviceId);
    }, 90);
  }

  useEffect(
    () => () => {
      if (hoverTimer.current !== null) {
        clearTimeout(hoverTimer.current);
      }
    },
    [],
  );

  return {
    isEnhanced,
    selectedService,
    hasInteracted,
    toggleService,
    scheduleHover,
    cancelHover,
  };
}
