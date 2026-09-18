"use client";

import { useEffect, useState } from "react";

type Me = {
  signedIn: boolean;
  provider?: string;
};

/** Fixed to the bottom of Parent Mode once signed in. */
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
    await fetch("/api/parent/auth/logout", { method: "POST" });
    window.location.assign("/p");
  }

  if (!me?.signedIn) return null;

  return (
    <div
      className="shrink-0 border-t border-black/10 bg-white/70 px-4 py-3 backdrop-blur-[2px]"
      data-testid="parent-signout-footer"
    >
      <button
        type="button"
        onClick={() => void signOut()}
        className="mx-auto block w-full max-w-md rounded-full bg-[var(--lavender)] px-5 py-3 text-base font-bold text-[var(--purple-deep)] shadow-md transition active:scale-[0.98]"
        data-testid="parent-signout"
      >
        Sign out
      </button>
    </div>
  );
}
