import type { ReactNode, RefObject } from "react";

interface HomeViewProps {
  active: boolean;
  cinematicHome: boolean;
  scrollRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}

export function HomeView({ active, cinematicHome, scrollRef, children }: HomeViewProps) {
  return (
    <div
      ref={scrollRef}
      style={{
        position: "absolute",
        inset: 0,
        overflowY: cinematicHome ? "visible" : "auto",
        zIndex: 2,
        pointerEvents: active ? "auto" : "none",
        contentVisibility: active ? "visible" : "hidden",
      }}
    >
      {children}
    </div>
  );
}
