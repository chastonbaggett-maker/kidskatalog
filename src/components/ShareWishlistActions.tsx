"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  parentSignInPath,
  parentSignUpPath,
  parentWishlistPath,
  parentWishlistUrl,
} from "@/lib/parent-paths";
import { siteOriginFromWindow } from "@/lib/site-url";

type Props = {
  ids: string[];
  /** Kid Kart handoff: open /p?ids=… plus a small parent-only entry. */
  showOpenLink?: boolean;
  showForParents?: boolean;
};

export function ShareWishlistActions({
  ids,
  showOpenLink = true,
  showForParents = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setOrigin(siteOriginFromWindow());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/parent/auth/me")
      .then((res) => res.json())
      .then((data: { signedIn?: boolean }) => {
        if (!cancelled) setSignedIn(Boolean(data.signedIn));
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const path = useMemo(() => parentWishlistPath(ids), [ids]);
  const url = origin ? parentWishlistUrl(ids, origin) : path;

  async function copyLink() {
    const full = parentWishlistUrl(ids, siteOriginFromWindow());
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {ids.length > 0 ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[var(--ink)]">
              Wish list link
            </span>
            <input
              readOnly
              value={url}
              data-testid="wishlist-share-url"
              onFocus={(e) => e.currentTarget.select()}
              className="rounded-full border-0 bg-[var(--lavender)] px-4 py-3 text-base text-[var(--ink)] outline-none ring-2 ring-transparent transition focus:ring-[var(--purple)]"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {showOpenLink ? (
              signedIn ? (
                <Link
                  href={path}
                  data-testid="open-parent-wishlist"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white shadow-md transition active:scale-[0.98]"
                >
                  <LockIcon />
                  Open Parent Mode
                </Link>
              ) : (
                <div
                  className="flex flex-1 flex-col gap-2"
                  data-testid="open-parent-auth-prompt"
                >
                  <Link
                    href={parentSignUpPath(path)}
                    data-testid="open-parent-signup"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white shadow-md transition active:scale-[0.98]"
                  >
                    <LockIcon />
                    Sign up for Parent Mode
                  </Link>
                  <Link
                    href={parentSignInPath(path)}
                    data-testid="open-parent-login"
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--lavender)] px-5 py-3.5 text-base font-bold text-[var(--purple-deep)] shadow-md transition active:scale-[0.98]"
                  >
                    Log in
                  </Link>
                </div>
              )
            ) : null}
            <button
              type="button"
              data-testid="copy-wishlist-link"
              onClick={() => void copyLink()}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--lavender)] px-5 py-3.5 text-base font-bold text-[var(--purple-deep)] shadow-md transition active:scale-[0.98]"
            >
              {copied ? "Copied!" : "Copy wish list link"}
            </button>
          </div>
        </>
      ) : null}
      {showForParents ? (
        <p className="text-sm text-[var(--ink-soft)]">
          Send your kids list to friends and family! Dont leave grandma guessing
          on Billys birthday :)
        </p>
      ) : null}
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
