"use client";

import { ShareWishlistActions } from "@/components/ShareWishlistActions";
import type { Toy } from "@/types/toy";

type Props = {
  toys: Toy[];
  /** Kart ids for the share URL — may be ready before toy rows load. */
  wishlistIds?: string[];
};

export function SendToParentForm({ toys, wishlistIds }: Props) {
  const ids = wishlistIds ?? toys.map((toy) => toy.id);

  return (
    <section className="shelf-panel shelf-panel--soft">
      <div className="shelf-panel__surface flex flex-col gap-4 p-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
            Send to Mom or Dad
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Copy or open the Parent Mode wish list. Kids never see buy links.
          </p>
        </div>

        <ShareWishlistActions ids={ids} showForParents />
      </div>
    </section>
  );
}
