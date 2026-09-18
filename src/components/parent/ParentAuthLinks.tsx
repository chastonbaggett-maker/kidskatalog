"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parentSignInPath, parentSignUpPath } from "@/lib/parent-paths";

type Me = {
  signedIn: boolean;
  email?: string | null;
  provider?: string;
};

const linkClass =
  "text-xs font-bold text-white underline-offset-2 hover:underline sm:text-sm";

export function ParentAuthLinks({ returnTo = "/p" }: { returnTo?: string }) {
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

  return (
    <div
      className="shelf-crazy-btn flex max-w-[9.5rem] flex-col items-end gap-0.5 text-right"
      data-testid="parent-auth-links"
    >
      {!me ? (
        <span className="text-xs font-bold text-white/80">…</span>
      ) : me.signedIn ? (
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 text-white ring-2 ring-white/40"
          data-testid="parent-profile-icon"
          aria-label={me.email ? `Signed in as ${me.email}` : "Signed in"}
          title={me.email || "Signed in"}
        >
          <ProfileIcon />
        </span>
      ) : (
        <>
          <Link
            href={parentSignInPath(returnTo)}
            className={linkClass}
            data-testid="parent-login-link"
          >
            Log in
          </Link>
          <Link
            href={parentSignUpPath(returnTo)}
            className={linkClass}
            data-testid="parent-signup-link"
          >
            Sign up
          </Link>
        </>
      )}
    </div>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M5 19.5c1.6-3.2 4-4.8 7-4.8s5.4 1.6 7 4.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
