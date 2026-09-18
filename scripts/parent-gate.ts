import { expect, type Page } from "@playwright/test";

/** Pass the Parent Mode birth-year gate when it is shown (signed-in parents). */
export async function unlockParentGate(page: Page, year = "1990") {
  const gate = page.getByTestId("parent-birth-year-gate");
  const authGate = page.getByTestId("parent-auth-gate");
  try {
    await Promise.race([
      gate.waitFor({ state: "visible", timeout: 15_000 }),
      authGate.waitFor({ state: "visible", timeout: 15_000 }),
      page.getByTestId("parent-add-kid").waitFor({ state: "visible", timeout: 15_000 }),
    ]);
  } catch {
    return;
  }
  if ((await authGate.count()) > 0) {
    // Caller should sign in first when auth gate is expected.
    return;
  }
  if ((await gate.count()) === 0) return;
  await page.getByTestId("parent-birth-year").fill(year);
  await page.getByTestId("parent-birth-year-submit").click();
  await expect(gate).toHaveCount(0);
}

/** Sign up a fresh parent and land on returnTo without the birth-year gate. */
export async function signUpParentSkippingGate(
  page: Page,
  opts: { email: string; password?: string; returnTo?: string },
) {
  const password = opts.password ?? "test-pass-123";
  const returnTo = opts.returnTo ?? "/p";
  await page.goto(
    `/p/sign-up?returnTo=${encodeURIComponent(returnTo)}`,
    { waitUntil: "domcontentloaded" },
  );
  const tap = page.getByRole("button", { name: /Tap to start KidsKatalog/i });
  try {
    await tap.waitFor({ state: "visible", timeout: 5000 });
    await tap.click();
  } catch {
    // already dismissed
  }
  await expect(page.getByTestId("parent-signup-form")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("parent-email").fill(opts.email);
  await page.getByTestId("parent-password").fill(password);
  await page.getByTestId("parent-auth-submit").click();
  await page.waitForURL((url) => url.pathname.startsWith("/p") && !url.pathname.includes("sign-"));
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByTestId("parent-auth-gate")).toHaveCount(0);
}
