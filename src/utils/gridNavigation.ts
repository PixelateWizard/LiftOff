export type GridDirection = "up" | "down" | "left" | "right";

export function moveGridFocus(
  currentIndex: number,
  itemCount: number,
  columnCount: number,
  direction: GridDirection,
): number {
  if (itemCount <= 0) return 0;

  const columns = Math.max(1, columnCount);
  const current = Math.max(0, Math.min(itemCount - 1, currentIndex));
  const rowStart = Math.floor(current / columns) * columns;
  const rowEnd = Math.min(rowStart + columns - 1, itemCount - 1);

  if (direction === "left") return Math.max(rowStart, current - 1);
  if (direction === "right") return Math.min(rowEnd, current + 1);
  if (direction === "up") return current >= columns ? current - columns : current;

  const nextRowStart = rowStart + columns;
  if (nextRowStart >= itemCount) return current;
  return Math.min(current + columns, itemCount - 1);
}
