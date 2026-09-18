import type { Page } from "@playwright/test";
import {
  PARENT_GATE_STORAGE_KEY,
  PARENT_GATE_UNLOCKED_FLAG,
} from "../src/lib/parent-birth-year";

/** Pretend this browser tab already passed the Parent Mode year gate. */
export async function seedParentGateUnlock(page: Page) {
  await page.addInitScript(
    ({ key, flag }: { key: string; flag: string }) => {
      try {
        sessionStorage.setItem(key, flag);
      } catch {
        // Storage can be blocked; tests that need a real prompt should not call this.
      }
    },
    { key: PARENT_GATE_STORAGE_KEY, flag: PARENT_GATE_UNLOCKED_FLAG },
  );
}
