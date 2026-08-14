/** Deterministic Fisher–Yates shuffle for a seed. */
export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Deterministic weighted shuffle (Efraimidis–Spirakis).
 * Higher weight → more likely toward the front of the order (shown sooner / more often across seeds).
 */
export function weightedShuffleWithSeed<T>(
  items: T[],
  seed: number,
  weightOf: (item: T) => number,
): T[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s + 1) / 4294967296;
  };

  return items
    .map((item) => {
      const weight = Math.max(1e-6, weightOf(item));
      const u = rand();
      // key = u^(1/w); larger keys sort first.
      const key = Math.pow(u, 1 / weight);
      return { item, key };
    })
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.item);
}
