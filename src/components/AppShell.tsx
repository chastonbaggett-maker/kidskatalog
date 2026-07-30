import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { InstallPrompt } from "./InstallPrompt";

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="app-shell flex flex-col">
      <div className="star-field flex min-h-0 flex-1 flex-col">{children}</div>
      {!hideNav && (
        <>
          {/* Reserve space so content isn't covered by the pinned nav */}
          <div
            className="shrink-0 pt-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
            aria-hidden
          >
            <div className="h-14" />
          </div>
          <BottomNav />
        </>
      )}
      <InstallPrompt />
    </div>
  );
}
