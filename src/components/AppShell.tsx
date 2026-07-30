import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { InstallPrompt } from "./InstallPrompt";

/** Shell layout is protected — see .cursor/rules/pwa-shell-layout.mdc */
export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="star-field flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      {!hideNav && <BottomNav />}
      <InstallPrompt />
    </div>
  );
}
