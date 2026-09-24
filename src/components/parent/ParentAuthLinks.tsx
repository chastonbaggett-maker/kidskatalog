"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  parentListsPath,
  parentSignInPath,
  parentSignUpPath,
} from "@/lib/parent-paths";

type Me = {
  signedIn: boolean;
  email?: string | null;
  provider?: string;
};

type Props = {
  returnTo?: string;
  /** `shelf` = white links on the mint header; `page` = ink links in the page toolbar. */
  tone?: "shelf" | "page";
};

export function ParentAuthLinks({
  returnTo = "/p",
  tone = "shelf",
}: Props) {
  const [me, setMe] = useState<Me | null>(null);
  const onPage = tone === "page";

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

  const linkClass = onPage
    ? "text-sm font-bold text-[var(--blue-deep)]"
    : "text-xs font-bold text-white underline-offset-2 hover:underline sm:text-sm";
  const mutedClass = onPage
    ? "text-sm font-bold text-[var(--ink-soft)]"
    : "text-xs font-bold text-white/80";

  return (
    <div
      className={
        onPage
          ? "flex items-center gap-3"
          : "shelf-crazy-btn flex max-w-[9.5rem] flex-col items-end gap-0.5 text-right"
      }
      data-testid="parent-auth-links"
    >
      {!me ? (
        <span className={mutedClass}>…</span>
      ) : me.signedIn ? (
        <>
          <Link
            href={parentListsPath()}
            className={linkClass}
            data-testid="my-lists-link"
          >
            My lists
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className={onPage ? mutedClass : linkClass}
            data-testid="parent-signout"
          >
            Sign out
          </button>
        </>
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
