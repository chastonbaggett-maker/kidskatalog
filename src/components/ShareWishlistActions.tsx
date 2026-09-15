"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  parentDealsPath,
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

  useEffect(() => {
    setOrigin(siteOriginFromWindow());
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
              <Link
                href={path}
                data-testid="open-parent-wishlist"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white shadow-md transition active:scale-[0.98]"
              >
                Open Parent Mode
              </Link>
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
          <Link
            href={parentDealsPath()}
            className="font-bold text-[var(--blue-deep)]"
            data-testid="for-parents-entry"
          >
            For parents
          </Link>
          {" — "}partner deals and wish-list help. Kids stay on shop and Watch.
        </p>
      ) : null}
    </div>
  );
}
