// CSS owns the clock, including delays. An aborted observer cannot settle a newer phase.
export async function observeAnimationCompletion(
  element: HTMLElement,
  signal: AbortSignal,
) {
  // Force style resolution so newly assigned CSS animations appear in getAnimations().
  element.getBoundingClientRect();
  const animations = element.getAnimations({ subtree: true });
  let handleAbort: () => void = () => {};
  const aborted = new Promise<false>((resolve) => {
    handleAbort = () => resolve(false);
    signal.addEventListener("abort", handleAbort, { once: true });
  });

  if (signal.aborted) {
    signal.removeEventListener("abort", handleAbort);
    return false;
  }

  try {
    const completed = Promise.allSettled(
      animations.map((animation) => animation.finished),
    ).then(() => !signal.aborted);
    return await Promise.race([completed, aborted]);
  } finally {
    signal.removeEventListener("abort", handleAbort);
  }
}

export function captureExitAppearance(
  surface: HTMLElement,
  closeControl: HTMLElement | null,
) {
  const plus = closeControl?.querySelector("svg");
  if (plus) {
    plus.style.setProperty(
      "--closing-rotation",
      getComputedStyle(plus).transform,
    );
  }

  surface.style.setProperty(
    "--closing-clip",
    getComputedStyle(surface).clipPath,
  );

  for (const link of surface.querySelectorAll<HTMLElement>("a")) {
    const appearance = getComputedStyle(link);
    link.style.setProperty("--closing-opacity", appearance.opacity);
    link.style.setProperty("--closing-transform", appearance.transform);
  }
}
