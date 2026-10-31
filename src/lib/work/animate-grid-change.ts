export function captureGridPositions(grid: HTMLElement) {
  return new Map(
    Array.from(
      grid.querySelectorAll<HTMLElement>("[data-project-id]"),
      (element) => [
        element.dataset.projectId!,
        element.getBoundingClientRect(),
      ],
    ),
  );
}

export function animateGridChange(
  grid: HTMLElement,
  previous: Map<string, DOMRect>,
) {
  const section = grid.closest("section")!;
  const styles = getComputedStyle(section);
  const movementDuration = Number(
    styles.getPropertyValue("--work-reflow-duration"),
  );
  const fadeDuration = Number(
    styles.getPropertyValue("--work-filter-fade-duration"),
  );
  const animations: Animation[] = [];

  for (const element of grid.querySelectorAll<HTMLElement>(
    "[data-project-id]",
  )) {
    const before = previous.get(element.dataset.projectId!);
    const after = element.getBoundingClientRect();
    if (before) {
      const horizontalDistance = before.left - after.left;
      const verticalDistance = before.top - after.top;
      if (horizontalDistance || verticalDistance) {
        animations.push(
          element.animate(
            [
              {
                transform: `translate(${horizontalDistance}px, ${verticalDistance}px)`,
              },
              { transform: "translate(0, 0)" },
            ],
            {
              duration: movementDuration,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            },
          ),
        );
      }
    } else if (after.bottom > 0 && after.top < innerHeight) {
      animations.push(
        element.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: fadeDuration,
          easing: "ease-out",
        }),
      );
    }
  }
  return () => animations.forEach((animation) => animation.cancel());
}
