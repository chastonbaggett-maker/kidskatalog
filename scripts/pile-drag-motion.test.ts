// Node's type stripper needs the .ts import suffix; the app tsconfig does not.
// @ts-nocheck
import assert from "node:assert/strict";
import {
  DRAG_EASE_IN_MS,
  DRAG_TAU_START_MS,
  DRAG_TAU_TRACK_MS,
  RELEASE_MAX_FLING_PX,
  dragFollowTau,
  easeOutCubic,
  releaseDestination,
  smoothToward,
  smoothstep,
} from "../src/lib/pile-drag-motion.ts";

assert.equal(smoothstep(0), 0);
assert.equal(smoothstep(1), 1);
assert.ok(smoothstep(0.2) < 0.2, "smoothstep eases in at the start");
assert.ok(smoothstep(0.8) > 0.8, "smoothstep eases out at the end");

assert.equal(easeOutCubic(0), 0);
assert.equal(easeOutCubic(1), 1);
assert.ok(easeOutCubic(0.5) > 0.5);

assert.equal(dragFollowTau(0), DRAG_TAU_START_MS);
assert.equal(dragFollowTau(DRAG_EASE_IN_MS), DRAG_TAU_TRACK_MS);
assert.ok(dragFollowTau(40) > dragFollowTau(140));

const started = smoothToward(0, 100, 16, DRAG_TAU_START_MS);
const tracking = smoothToward(0, 100, 16, DRAG_TAU_TRACK_MS);
assert.ok(started > 0 && started < 40, `ease-in step should be gentle, got ${started}`);
assert.ok(tracking > started && tracking < 100);

const held = releaseDestination(10, 20, 0, 0, 0, 0);
assert.equal(held.duration, 0);
assert.equal(held.x, 10);
assert.equal(held.y, 20);

const coast = releaseDestination(0, 0, 0, 0, 1, 0);
assert.ok(coast.duration >= 280);
assert.ok(coast.x > 0 && coast.x <= RELEASE_MAX_FLING_PX);
assert.equal(coast.y, 0);

const capped = releaseDestination(0, 0, 0, 0, 8, 0);
assert.equal(capped.x, RELEASE_MAX_FLING_PX);

const steps = [0.25, 0.5, 0.75].map((t) => easeOutCubic(t) - easeOutCubic(t - 0.25));
assert.ok(steps[0]! > steps[1]! && steps[1]! > steps[2]!, "release steps shrink");

console.log("pile-drag-motion ok");
