// Node's type stripper needs the .ts import suffix; the app tsconfig does not.
// @ts-nocheck
import assert from "node:assert/strict";
import {
  PILE_CARD_BATCH,
  selectPileMounts,
  spiralIndex,
} from "../src/lib/pile-cards.ts";

assert.equal(PILE_CARD_BATCH, 12);
assert.equal(spiralIndex(0, 0), 0);
assert.ok(spiralIndex(1, 0) > 0);

const aroundOrigin = [];
for (let row = -6; row <= 6; row++) {
  for (let col = -6; col <= 6; col++) aroundOrigin.push({ col, row });
}

const first = selectPileMounts(aroundOrigin, 12, 0, 0);
assert.ok(first.mounts.length <= 12);
assert.ok(first.mounts.length > 0);
assert.equal(first.needsMore, true);
for (const cell of first.mounts) {
  assert.ok(spiralIndex(cell.col, cell.row) < 12);
}

const settled = selectPileMounts(aroundOrigin, 24, 0, 0);
assert.equal(settled.mounts.length, 12);
assert.equal(settled.needsMore, false);

const panned = selectPileMounts(aroundOrigin, 12, 6, 0);
assert.ok(panned.mounts.length < 12);
assert.equal(panned.needsMore, true);
assert.ok(panned.mounts.every((cell) => spiralIndex(cell.col, cell.row) < 12));

const filled = selectPileMounts(aroundOrigin, aroundOrigin.length, 6, 0);
assert.equal(filled.mounts.length, 12);
assert.equal(filled.needsMore, false);

const empty = selectPileMounts(aroundOrigin, 0, 0, 0);
assert.equal(empty.mounts.length, 0);
assert.equal(empty.needsMore, true);

console.log("pile-cards ok");
