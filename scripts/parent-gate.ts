import { expect, type Page } from "@playwright/test";

/** Pass the Parent Mode birth-year gate on the current page (required every entry). */
export async function unlockParentGate(page: Page, year = "1990") {
  const gate = page.getByTestId("parent-birth-year-gate");
  try {
    await gate.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    return;
  }
  await page.getByTestId("parent-birth-year").fill(year);
  await page.getByTestId("parent-birth-year-submit").click();
  await expect(gate).toHaveCount(0);
}

/** @deprecated Use unlockParentGate after navigating to a /p route. */
export async function seedParentGateUnlock(page: Page) {
  await unlockParentGate(page);
}
