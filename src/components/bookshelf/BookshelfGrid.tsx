import { forwardRef, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import type { App } from "../../types";
import { floppyColor } from "./bookshelfParts";

interface ShelfMetrics {
  firstTop: number;
  pitch: number;
  cardH: number;
  rows: number;
  focus: { x: number; w: number; bottom: number } | null;
}

const sameMetrics = (a: ShelfMetrics | null, b: ShelfMetrics | null) =>
  !!a && !!b
  && a.firstTop === b.firstTop && a.pitch === b.pitch && a.cardH === b.cardH && a.rows === b.rows
  && a.focus?.x === b.focus?.x && a.focus?.w === b.focus?.w && a.focus?.bottom === b.focus?.bottom;

interface BookshelfGridShelvesProps {
  count: number;
  cols: number;
  focusedIndex: number | null;
}

/**
 * Planks, wall rails, and the focus marker behind a Games or Apps grid. It is an
 * absolutely positioned first child, so it takes no grid cell. Row geometry is
 * measured from the cards because card height follows the grid width.
 */
export function BookshelfGridShelves({ count, cols, focusedIndex }: BookshelfGridShelvesProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState<ShelfMetrics | null>(null);

  useLayoutEffect(() => {
    // The grid is the parent element. A ref on the grid would still be null here on
    // first mount, because child layout effects run before the parent's ref attaches.
    const grid = rootRef.current?.parentElement;
    if (!grid) return;
    const measure = () => {
      const cards = Array.from(grid.querySelectorAll<HTMLElement>(":scope > [data-card]"));
      if (cards.length === 0) {
        setMetrics(null);
        return;
      }
      const first = cards[0];
      const safeCols = Math.max(1, cols);
      const rowGap = parseFloat(getComputedStyle(grid).rowGap || "0") || 0;
      const pitch = cards.length > safeCols ? cards[safeCols].offsetTop - first.offsetTop : first.offsetHeight + rowGap;
      const focused = focusedIndex != null ? cards[focusedIndex] : undefined;
      const next: ShelfMetrics = {
        firstTop: first.offsetTop,
        pitch,
        cardH: first.offsetHeight,
        rows: Math.ceil(cards.length / safeCols),
        focus: focused ? { x: focused.offsetLeft, w: focused.offsetWidth, bottom: focused.offsetTop + focused.offsetHeight } : null,
      };
      setMetrics((prev) => (sameMetrics(prev, next) ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [count, cols, focusedIndex]);

  const planks = metrics ? Array.from({ length: metrics.rows }, (_, row) => metrics.firstTop + row * metrics.pitch + metrics.cardH) : [];
  return (
    <div ref={rootRef} className="bs-grid-shelves" aria-hidden="true">
      {metrics && <div className="bs-rails" />}
      {planks.map((top, row) => (
        <div key={row} className="bs-plank" style={{ top }}>
          <div className="bs-plank-top" />
          <div className="bs-plank-front" />
        </div>
      ))}
      {metrics?.focus && (
        <>
          <div
            className="bs-pool lo-bs-motion"
            style={{ transform: `translate(${metrics.focus.x + metrics.focus.w / 2 - 105}px, ${metrics.focus.bottom - 18}px)` }}
          />
          <div
            className="bs-marker lo-bs-motion"
            style={{ width: metrics.focus.w, transform: `translate(${metrics.focus.x}px, ${metrics.focus.bottom - 1}px)` }}
          />
        </>
      )}
    </div>
  );
}

interface BookshelfAppCardProps {
  app: App;
  focused: boolean;
  art?: string | null;
  color?: { r: number; g: number; b: number } | null;
  icon: ReactNode;
  badges?: ReactNode;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (event: ReactMouseEvent) => void;
}

/** Apps tab card drawn as a labeled floppy disk. Keeps the grid card contract (data-card, data-app-id, focused class). */
export const BookshelfAppCard = forwardRef<HTMLDivElement, BookshelfAppCardProps>(function BookshelfAppCard(
  { app, focused, art, color, icon, badges, onClick, onDoubleClick, onContextMenu },
  ref,
) {
  return (
    <div
      ref={ref}
      data-card=""
      data-app-id={app.id}
      className={`bs-floppy-card lo-bs-motion${focused ? " focused" : ""}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{ ["--bs-floppy" as string]: floppyColor(app.id, color) }}
    >
      <div className="bs-floppy">
        <div className="bs-floppy-shutter" />
        <div className="bs-floppy-label">
          <span className="bs-floppy-icon">
            {art ? <img src={art} alt="" draggable={false} /> : icon}
          </span>
          <span className="bs-floppy-name">{app.name}</span>
        </div>
        <span className="bs-floppy-notch bs-floppy-notch--l" />
        <span className="bs-floppy-notch bs-floppy-notch--r" />
      </div>
      {badges}
    </div>
  );
});
