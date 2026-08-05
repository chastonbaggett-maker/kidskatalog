"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { InstallPrompt } from "./InstallPrompt";
import { KartNavEffectGuard } from "./KartNavEffectGuard";
import { KartEffectClassSync } from "./KartEffectClassSync";
import { MetricsPing } from "./MetricsPing";
import { KartFlyBallOverlay } from "@/hooks/useKartFlyBall";
import { useRouteChangeLock } from "@/hooks/useRouteChangeLock";

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
      <KartEffectClassSync />
      <MetricsPing />
      <div className="star-field flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      {!hideNav && <BottomNav />}
      <KartFlyBallOverlay />
      <InstallPrompt />
    </div>
  );
}
