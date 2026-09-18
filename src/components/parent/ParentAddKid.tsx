"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccentStore } from "@/lib/accent-store";
import {
  parentSavedListQueryPath,
  parentSignInPath,
  parentSignUpPath,
} from "@/lib/parent-paths";
import { useParentWishlistStore } from "@/lib/parent-wishlist-store";
import type { Audience } from "@/types/toy";

type Me = { signedIn: boolean };

type GenderChoice = Extract<Audience, "boys" | "girls">;

/**
 * Starts a new empty wish list named after the kid and sets the default
 * boys/girls gender mode for the session.
 */
export function ParentAddKid({ returnTo = "/p" }: { returnTo?: string }) {
  const router = useRouter();
  const setAudience = useAccentStore((s) => s.setAudience);
  const replaceIds = useParentWishlistStore((s) => s.replaceIds);
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [kidName, setKidName] = useState("");
  const [gender, setGender] = useState<GenderChoice | "">("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

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

  async function createKidList() {
    const name = kidName.trim();
    if (!name) {
      setStatus("error");
      setMessage("Enter the kid's name.");
      return;
    }
    if (gender !== "boys" && gender !== "girls") {
      setStatus("error");
      setMessage("Pick boys or girls.");
      return;
    }

    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/parent/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          audience: gender,
          toyIds: [],
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        list?: { id: string; audience?: Audience };
      };
      if (!res.ok || !data.list) {
        throw new Error(data.error || "Could not create list");
      }
      setAudience(gender);
      replaceIds([]);
      router.push(parentSavedListQueryPath(data.list.id));
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Could not create list",
      );
    }
  }

  return (
    <div className="shelf-panel shelf-panel--soft" data-testid="parent-add-kid">
      <div className="shelf-panel__surface flex flex-col gap-3 p-5">
        {!open ? (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
              Add kid
            </h2>
            <p className="text-sm text-[var(--ink-soft)]">
              Start a new wish list for one kid. We&apos;ll name it after them
              and set boys or girls mode.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white shadow-md transition active:scale-[0.98]"
              data-testid="add-kid-open"
            >
              Add kid
            </button>
          </>
        ) : me && !me.signedIn ? (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
              Add kid
            </h2>
            <p className="text-sm text-[var(--ink-soft)]">
              Log in or sign up to save a list for each kid.
            </p>
            <p className="text-sm font-bold text-[var(--blue-deep)]">
              <Link
                href={parentSignUpPath(returnTo)}
                data-testid="add-kid-signup"
              >
                Sign up
              </Link>
              {" · "}
              <Link
                href={parentSignInPath(returnTo)}
                data-testid="add-kid-login"
              >
                Log in
              </Link>
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-bold text-[var(--ink-soft)]"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
              Add kid
            </h2>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[var(--ink)]">
                Kid&apos;s name
              </span>
              <input
                value={kidName}
                onChange={(event) => setKidName(event.target.value)}
                placeholder="Name"
                autoComplete="off"
                className="rounded-full border-0 bg-[var(--lavender)] px-4 py-3 text-base text-[var(--ink)] outline-none ring-2 ring-transparent transition focus:ring-[var(--purple)]"
                data-testid="add-kid-name"
              />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold text-[var(--ink)]">
                Gender mode
              </legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGender("boys")}
                  className={`rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-sm transition ${
                    gender === "boys"
                      ? "bg-[var(--boys-chip)]"
                      : "bg-[var(--boys-chip)]/45"
                  }`}
                  data-testid="add-kid-gender-boys"
                  aria-pressed={gender === "boys"}
                >
                  Boys
                </button>
                <button
                  type="button"
                  onClick={() => setGender("girls")}
                  className={`rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-sm transition ${
                    gender === "girls"
                      ? "bg-[var(--girls-chip)]"
                      : "bg-[var(--girls-chip)]/45"
                  }`}
                  data-testid="add-kid-gender-girls"
                  aria-pressed={gender === "girls"}
                >
                  Girls
                </button>
              </div>
            </fieldset>
            <button
              type="button"
              onClick={() => void createKidList()}
              disabled={status === "saving" || me === null}
              className="rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              data-testid="add-kid-submit"
            >
              {status === "saving" ? "Starting…" : "Start list"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setMessage("");
                setStatus("idle");
              }}
              className="text-sm font-bold text-[var(--ink-soft)]"
            >
              Cancel
            </button>
            {message ? (
              <p className="text-sm font-medium text-red-600" role="status">
                {message}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
