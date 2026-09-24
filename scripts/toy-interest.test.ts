// Node's type stripper needs the .ts import suffix; the app tsconfig does not.
// @ts-nocheck
import assert from "node:assert/strict";
import {
  interestScore,
  rankIdsByInterest,
  INTEREST_OPEN_POINTS,
  INTEREST_PHOTO_POINTS,
} from "../src/lib/toy-interest.ts";
import {
  parentWishlistPath,
  parseWishlistInterest,
} from "../src/lib/parent-paths.ts";

const quiet = { opens: 1, photos: 0, seconds: 0 };
const played = { opens: 3, photos: 4, seconds: 27 };

assert.equal(interestScore(undefined), 0);
assert.equal(interestScore(quiet), INTEREST_OPEN_POINTS);
assert.equal(
  interestScore(played),
  3 * INTEREST_OPEN_POINTS + 4 * INTEREST_PHOTO_POINTS + 5,
);

const ranked = rankIdsByInterest(["quiet", "played", "new"], (id) => {
  if (id === "played") return interestScore(played);
  if (id === "quiet") return interestScore(quiet);
  return 0;
});
assert.deepEqual(ranked, ["played", "quiet", "new"]);

const tied = rankIdsByInterest(["first", "second"], () => 10);
assert.deepEqual(tied, ["first", "second"]);

const path = parentWishlistPath(["played", "quiet"], {
  played: interestScore(played),
  quiet: 0,
});
assert.equal(path, `/p?ids=played,quiet&interest=played:${interestScore(played)}`);
assert.deepEqual(parseWishlistInterest(`played:${interestScore(played)}`), {
  played: interestScore(played),
});
assert.deepEqual(parseWishlistInterest(""), {});
