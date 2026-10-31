import type { WorkFilter } from "@/data/projects";
import styles from "./WorkFilters.module.css";

const filters: WorkFilter[] = ["All", "Real projects", "Explorations"];

export function WorkFilters({
  selectedFilter,
  onSelect,
  enabled,
}: {
  selectedFilter: WorkFilter;
  onSelect: (filter: WorkFilter) => void;
  enabled: boolean;
}) {
  return (
    <div role="group" aria-label="Filter projects" className={styles.filters}>
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          disabled={!enabled}
          aria-pressed={selectedFilter === filter}
          onClick={() => onSelect(filter)}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
