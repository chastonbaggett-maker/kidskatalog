"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { InstallPrompt } from "./InstallPrompt";
import { KartNavEffectGuard } from "./KartNavEffectGuard";
import { MetricsPing } from "./MetricsPing";
import { KartFlyBallOverlay } from "@/hooks/useKartFlyBall";
import { useRouteChangeLock } from "@/hooks/useRouteChangeLock";
import { registerAppFxRoot } from "@/lib/app-fx-root";

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  useRouteChangeLock();

  return (
    <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <KartNavEffectGuard />
      <MetricsPing />
      <div className="star-field flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      {!hideNav && <BottomNav />}
      <div
        ref={registerAppFxRoot}
        className="app-shell__fx pointer-events-none fixed inset-0 z-[120] overflow-hidden"
        aria-hidden
      >
        <KartFlyBallOverlay />
      </div>
      <InstallPrompt />
    </div>
  );
}
