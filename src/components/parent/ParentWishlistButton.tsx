"use client";

import { useParentWishlistStore } from "@/lib/parent-wishlist-store";

export function ParentWishlistButton({ toyId }: { toyId: string }) {
  const saved = useParentWishlistStore((s) => s.ids.includes(toyId));
  const add = useParentWishlistStore((s) => s.add);
  const remove = useParentWishlistStore((s) => s.remove);

  return (
    <button
      type="button"
      onClick={() => (saved ? remove(toyId) : add(toyId))}
      className={`add-kart-btn add-kart-btn--pill h-[3.9rem] min-w-0 flex-1 rounded-full px-5 text-base font-bold shadow-md add-kart-btn--visual-ready ${
        saved ? "add-kart-btn--in" : "add-kart-btn--ready"
      }`}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wish list" : "Save to wish list"}
    >
      <span className="add-kart-btn__label relative z-[2] inline-flex items-center justify-center">
        {saved ? "On your list" : "Save to wish list"}
      </span>
    </button>
  );
}
