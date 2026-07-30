"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = window.localStorage.getItem("kk-install-dismissed");
    if (dismissed === "1") return;

    // Already installed / standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);
    if (standalone) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden || !deferred) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[1.5rem] bg-white/95 p-3 shadow-[0_12px_40px_-16px_rgba(60,70,120,0.55)] ring-1 ring-black/5 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--ink)]">
            Install KidsKatalog
          </p>
          <p className="text-sm text-[var(--ink-soft)]">
            Add to your home screen for quick toy browsing.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
            setHidden(true);
          }}
        >
          Install
        </button>
        <button
          type="button"
          className="shrink-0 rounded-full px-3 py-2 text-sm font-bold text-[var(--ink-soft)]"
          aria-label="Dismiss"
          onClick={() => {
            window.localStorage.setItem("kk-install-dismissed", "1");
            setHidden(true);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
