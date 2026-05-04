import type { ReactNode, RefObject } from "react";

interface AppsViewProps {
  scrollRef: RefObject<HTMLDivElement>;
  wideLayout: boolean;
  children: ReactNode;
}

export function AppsView({ scrollRef, wideLayout, children }: AppsViewProps) {
  return (
    <div ref={scrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto", zIndex: 2 }}>
      <div style={{ padding: "0 24px 0", ...(wideLayout ? {} : { maxWidth: 1400, margin: "0 auto" }), width: "100%", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}
