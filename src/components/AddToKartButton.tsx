"use client";

import { useKartStore } from "@/lib/kart-store";

export function AddToKartButton({ toyId }: { toyId: string }) {
  const inKart = useKartStore((s) => s.ids.includes(toyId));
  const toggle = useKartStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={() => toggle(toyId)}
      className={`rounded-full px-6 py-3.5 text-base font-bold shadow-md transition active:scale-[0.98] ${
        inKart
          ? "bg-[var(--purple-deep)] text-white"
          : "bg-[var(--blue)] text-white hover:bg-[var(--blue-deep)]"
      }`}
      aria-pressed={inKart}
    >
      {inKart ? "In Kart — tap to remove" : "+ Add to Kart"}
    </button>
  );
}
