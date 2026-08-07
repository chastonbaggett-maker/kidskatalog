"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { InstallPrompt } from "./InstallPrompt";
import { KartFlyBallHost } from "./KartFlyBallHost";
import { KartNavEffectGuard } from "./KartNavEffectGuard";
import { MetricsPing } from "./MetricsPing";
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
      <MetricsPing />
      <div className="star-field flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      {!hideNav && <BottomNav />}
      {/* Stable host for fly-ball + confetti (keeps effects off document.body) */}
      <div id="kart-fx-root" className="kart-fx-root" aria-hidden />
      <KartFlyBallHost />
      <InstallPrompt />
    </div>
  );
}
