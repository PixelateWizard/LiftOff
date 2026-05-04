import type { ReactNode } from "react";

interface AppOverlaysProps {
  children: ReactNode;
}

export function AppOverlays({ children }: AppOverlaysProps) {
  return <>{children}</>;
}
