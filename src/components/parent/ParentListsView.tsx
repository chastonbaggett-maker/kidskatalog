"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ParentAddKid } from "@/components/parent/ParentAddKid";
import { ParentAuthLinks } from "@/components/parent/ParentAuthLinks";
import { ShelfHeader } from "@/components/ShelfHeader";
import {
  parentSavedListPath,
  parentSignInPath,
  parentSignUpPath,
} from "@/lib/parent-paths";
import type { Audience } from "@/types/toy";

type SavedList = {
  id: string;
  name: string;
  audience?: Audience;
  toyIds: string[];
  updatedAt: string;
};

function audienceLabel(audience: Audience | undefined): string {
  if (audience === "boys") return "Boys";
  if (audience === "girls") return "Girls";
  return "Both";
}

export function ParentListsView() {
  const [lists, setLists] = useState<SavedList[] | null>(null);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/parent/auth/me")
      .then((res) => res.json())
      .then((me: { signedIn?: boolean }) => {
        if (cancelled) return;
        setSignedIn(Boolean(me.signedIn));
        if (!me.signedIn) {
          setLists([]);
          return;
        }
        return fetch("/api/parent/lists");
      })
      .then((res) => (res ? res.json() : null))
      .then((data: { lists?: SavedList[]; error?: string } | null) => {
        if (cancelled || !data) return;
        if (data.error) {
          setError(data.error);
          setLists([]);
          return;
        }
        setLists(data.lists ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load lists");
          setLists([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function removeList(id: string) {
    const res = await fetch(`/api/parent/lists/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLists((current) => (current ?? []).filter((list) => list.id !== id));
    }
  }

  return (
    <div className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShelfHeader
        title="Kids"
        subtitle="Wish lists by kid"
        backHref="/p"
        logoHref="/p"
        trailing={<ParentAuthLinks returnTo="/p/lists" />}
      />
      <div className="page-scroll star-field min-h-0 flex-1 space-y-4 px-4 py-4 scroll-pad-bottom">
        {signedIn === false ? (
          <div className="shelf-panel">
            <div className="shelf-panel__surface px-6 py-14 text-center">
              <p className="mb-3 text-[var(--ink-soft)]">
                Log in or sign up to save lists and open them later.
              </p>
              <p className="text-sm font-bold text-[var(--blue-deep)]">
                <Link href={parentSignUpPath("/p/lists")}>Sign up</Link>
                {" · "}
                <Link href={parentSignInPath("/p/lists")}>Log in</Link>
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm font-medium text-red-600">{error}</p>
        ) : null}

        {signedIn ? <ParentAddKid returnTo="/p/lists" /> : null}

        {signedIn && lists && lists.length === 0 ? (
          <div className="shelf-panel">
            <div className="shelf-panel__surface px-6 py-14 text-center">
              <p className="text-[var(--ink-soft)]">
                No kids yet. Add a kid to start a list, or open a /p?ids= link
                and tap Save list.
              </p>
            </div>
          </div>
        ) : null}

        {lists && lists.length > 0 ? (
          <ul className="flex flex-col gap-3" data-testid="saved-lists">
            {lists.map((list) => (
              <li key={list.id} className="shelf-panel shelf-panel--soft">
                <div className="shelf-panel__surface flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <Link href={parentSavedListPath(list.id)}>
                      <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
                        {list.name}
                      </p>
                    </Link>
                    <p className="text-sm text-[var(--ink-soft)]">
                      {audienceLabel(list.audience)}
                      {" · "}
                      {list.toyIds.length} toy
                      {list.toyIds.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Link
                    href={parentSavedListPath(list.id)}
                    className="rounded-full bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white"
                    data-testid="open-saved-list-row"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => void removeList(list.id)}
                    className="rounded-full bg-[var(--lavender)] px-3 py-2 text-sm font-bold text-[var(--purple-deep)]"
                    aria-label={`Delete ${list.name}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
