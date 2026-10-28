export function getRevealGeometry(
  button: Pick<DOMRect, "left" | "top" | "width" | "height">,
  viewport: { width: number; height: number },
) {
  const centerX = button.left + button.width / 2;
  const centerY = button.top + button.height / 2;
  const farthestX = Math.max(centerX, viewport.width - centerX);
  const farthestY = Math.max(centerY, viewport.height - centerY);

  return {
    centerX,
    centerY,
    radius: Math.ceil(Math.hypot(farthestX, farthestY)),
  };
}
