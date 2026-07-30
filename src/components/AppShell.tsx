import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { InstallPrompt } from "./InstallPrompt";
import { ViewportLock } from "./ViewportLock";

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="app-shell flex flex-col">
      <ViewportLock />
      <div className="star-field flex min-h-0 flex-1 flex-col">{children}</div>
      {!hideNav && <BottomNav />}
      <InstallPrompt />
    </div>
  );
}
