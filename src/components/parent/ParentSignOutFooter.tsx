"use client";

import { useEffect, useState } from "react";

type Me = {
  signedIn: boolean;
  provider?: string;
};

/**
 * Quiet Sign out at the end of scrollable Parent Mode content — not sticky.
 * Meant to stay out of the way; most parents should never need it.
 */
export function ParentSignOutFooter() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/parent/auth/me")
      .then((res) => res.json())
      .then((data: Me) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe({ signedIn: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    if (me?.provider === "clerk") {
      const clerk = (
        window as Window & { Clerk?: { signOut?: () => Promise<void> } }
      ).Clerk;
      await clerk?.signOut?.();
    }
    const { clearParentAuthBypass } = await import("@/lib/parent-auth-bypass");
    clearParentAuthBypass();
    await fetch("/api/parent/auth/logout", { method: "POST" });
    window.location.assign("/p");
  }

  if (!me?.signedIn) return null;

  return (
    <div
      className="pt-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center"
      data-testid="parent-signout-footer"
    >
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-xs font-medium text-[var(--ink-soft)] underline-offset-2 hover:underline"
        data-testid="parent-signout"
      >
        Sign out
      </button>
    </div>
  );
}
