import type { ReactNode } from "react";

interface AppMainContentProps {
  children: ReactNode;
}

export function AppMainContent({ children }: AppMainContentProps) {
  return <>{children}</>;
}
