import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Project, WorkFilter } from "@/data/projects";
import {
  captureGridPositions,
  animateGridChange,
} from "@/lib/work/animate-grid-change";

const subscribe = () => () => {};

export function useWorkFilter(projects: readonly Project[]) {
  const [selectedFilter, setSelectedFilter] = useState<WorkFilter>("All");
  const requestedFilter = useRef<WorkFilter>("All");
  const gridRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const previousPositions = useRef<Map<string, DOMRect> | null>(null);
  const cancelMovement = useRef<(() => void) | null>(null);
  const isEnhanced = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const filteredProjects = projects.filter(
    (project) =>
      selectedFilter === "All" || project.category === selectedFilter,
  );

  function selectFilter(filter: WorkFilter) {
    if (filter === requestedFilter.current || !gridRef.current) {
      return;
    }
    requestedFilter.current = filter;

    // Capture the currently painted positions before cancelling interrupted movement.
    previousPositions.current = captureGridPositions(gridRef.current);
    cancelMovement.current?.();
    setSelectedFilter(filter);
  }

  useLayoutEffect(() => {
    if (!gridRef.current || !previousPositions.current) {
      return;
    }
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cancelMovement.current = animateGridChange(
        gridRef.current,
        previousPositions.current,
      );
    }
    previousPositions.current = null;
  }, [selectedFilter]);

  useEffect(() => {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    function settleMovement() {
      cancelMovement.current?.();
      cancelMovement.current = null;
    }
    window.addEventListener("resize", settleMovement);
    reducedMotion.addEventListener("change", settleMovement);
    return () => {
      window.removeEventListener("resize", settleMovement);
      reducedMotion.removeEventListener("change", settleMovement);
      settleMovement();
    };
  }, []);

  return {
    selectedFilter,
    filteredProjects,
    selectFilter,
    gridRef,
    galleryRef,
    isEnhanced,
  };
}
