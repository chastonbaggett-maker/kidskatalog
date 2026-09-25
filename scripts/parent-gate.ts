import type { Page } from "@playwright/test";
import {
  PARENT_GATE_STORAGE_KEY,
  PARENT_GATE_UNLOCKED_FLAG,
} from "../src/lib/parent-birth-year";
import { SITE_MODE_COOKIE, SITE_MODE_KID } from "../src/lib/site-mode";

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

/** Device cookie that keeps `/` and `/p` in Kid Mode until the birth-year gate. */
export async function seedKidMode(page: Page) {
  await page.context().addCookies([
    {
      name: SITE_MODE_COOKIE,
      value: SITE_MODE_KID,
      url: "http://localhost:3456",
    },
  ]);
}
