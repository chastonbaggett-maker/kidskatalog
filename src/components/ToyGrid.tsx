import type { Toy } from "@/types/toy";
import { ToyCard } from "./ToyCard";

export function ToyGrid({ toys }: { toys: Toy[] }) {
  if (toys.length === 0) {
    return (
      <p className="rounded-3xl bg-white/60 px-6 py-12 text-center text-[var(--ink-soft)]">
        No toys here yet. Try another pile.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {toys.map((toy) => (
        <ToyCard key={toy.id} toy={toy} />
      ))}
    </div>
  );
}
