/** How a kid engaged with one toy. The Kart ranks saved toys by this. */
export type ToyInterest = {
  opens: number;
  photos: number;
  seconds: number;
};

/** Opening the toy card is the strongest signal. */
export const INTEREST_OPEN_POINTS = 10;
/** Each photo they actually land on. */
export const INTEREST_PHOTO_POINTS = 4;
/** Looking time adds one point per this many visible seconds. */
export const INTEREST_SECONDS_PER_POINT = 5;
/** One visit cannot dominate the rank by leaving the tab open. */
export const INTEREST_MAX_SECONDS_PER_VISIT = 180;

export function emptyInterest(): ToyInterest {
  return { opens: 0, photos: 0, seconds: 0 };
}

export function interestScore(entry: ToyInterest | undefined): number {
  if (!entry) return 0;
  const opens = Math.max(0, entry.opens);
  const photos = Math.max(0, entry.photos);
  const seconds = Math.max(0, entry.seconds);
  return (
    opens * INTEREST_OPEN_POINTS +
    photos * INTEREST_PHOTO_POINTS +
    Math.floor(seconds / INTEREST_SECONDS_PER_POINT)
  );
}

/** Higher interest first. Equal scores keep the original order. */
export function rankIdsByInterest(
  ids: string[],
  scoreOf: (id: string) => number,
): string[] {
  return ids
    .map((id, index) => ({ id, index, score: scoreOf(id) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.id);
}
