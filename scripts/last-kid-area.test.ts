// @ts-nocheck
import assert from "node:assert/strict";
import {
  DEFAULT_KID_AREA,
  isKidBrowsePath,
  LAST_KID_AREA_KEY,
  readLastKidArea,
  rememberKidArea,
} from "../src/lib/last-kid-area.ts";

assert.equal(isKidBrowsePath("/shop"), true);
assert.equal(isKidBrowsePath("/toy/mag-tiles"), true);
assert.equal(isKidBrowsePath("/menu"), true);
assert.equal(isKidBrowsePath("/kart"), false);
assert.equal(isKidBrowsePath("/p"), false);

globalThis.sessionStorage = {
  store: Object.create(null),
  getItem(key) {
    return this.store[key] ?? null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
};

rememberKidArea("/kart");
assert.equal(sessionStorage.getItem(LAST_KID_AREA_KEY), null);
assert.equal(readLastKidArea(), DEFAULT_KID_AREA);

rememberKidArea("/toy/mag-tiles");
assert.equal(readLastKidArea(), "/toy/mag-tiles");

rememberKidArea("/shop", "?age=3");
assert.equal(readLastKidArea(), "/shop?age=3");

console.log("last-kid-area: ok");
