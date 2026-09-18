import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import {
  isAllowedParentBirthYear,
  PARENT_BIRTH_YEAR_MAX,
  PARENT_BIRTH_YEAR_MIN,
} from "../src/lib/parent-birth-year";
import { unlockParentGate } from "./parent-gate";

async function dismissSplash(page: Page) {
  const splash = page.locator(".app-splash");
  if (await splash.count()) {
    await splash.first().click({ force: true });
    await page
      .waitForFunction(() => !document.documentElement.dataset.splash, null, {
        timeout: 10_000,
      })
      .catch(() => undefined);
  }
}

async function signUpViaApi(request: APIRequestContext, email: string) {
  const res = await request.post("/api/parent/auth/signup", {
    data: { email, password: "test-pass-123" },
  });
  expect(res.ok()).toBeTruthy();
}

/** Already signed in (cookie), no auth bypass → birth-year gate. */
async function openBirthYearGate(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByTestId("parent-auth-gate")).toHaveCount(0);
  await expect(page.getByTestId("parent-birth-year-gate")).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("heading", { name: /What'?s your birth year\?/i }),
  ).toBeVisible();
}

async function submitYear(page: Page, year: string) {
  await page.getByTestId("parent-birth-year").fill(year);
  await page.getByTestId("parent-birth-year-submit").click();
}

test("birth-year parser allows 1901–2008 integers only", () => {
  expect(PARENT_BIRTH_YEAR_MIN).toBe(1901);
  expect(PARENT_BIRTH_YEAR_MAX).toBe(2008);
  expect(isAllowedParentBirthYear("1901")).toBeTruthy();
  expect(isAllowedParentBirthYear("2008")).toBeTruthy();
  expect(isAllowedParentBirthYear("1990")).toBeTruthy();
  expect(isAllowedParentBirthYear(" 1990 ")).toBeTruthy();

  expect(isAllowedParentBirthYear("")).toBeFalsy();
  expect(isAllowedParentBirthYear("   ")).toBeFalsy();
  expect(isAllowedParentBirthYear("abc")).toBeFalsy();
  expect(isAllowedParentBirthYear("19")).toBeFalsy();
  expect(isAllowedParentBirthYear("200")).toBeFalsy();
  expect(isAllowedParentBirthYear("2008.5")).toBeFalsy();
  expect(isAllowedParentBirthYear("01990")).toBeFalsy();
  expect(isAllowedParentBirthYear("1899")).toBeFalsy();
  expect(isAllowedParentBirthYear("1900")).toBeFalsy();
  expect(isAllowedParentBirthYear("2009")).toBeFalsy();
  expect(isAllowedParentBirthYear("2010")).toBeFalsy();
});

test("signed-out Parent Mode asks for log in, not birth year", async ({
  page,
}) => {
  await page.goto("/p?ids=sky-rocket", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByTestId("parent-auth-gate")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByTestId("parent-auth-gate-signup")).toBeVisible();
  await expect(page.getByTestId("parent-auth-gate-login")).toBeVisible();
});

test("sign-up from Kart lands in Parent Mode without birth year", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  const sample = ["sky-rocket", "roar-rex"];
  await context
    .grantPermissions(["clipboard-read", "clipboard-write"])
    .catch(() => undefined);
  await page.addInitScript((seedIds: string[]) => {
    localStorage.setItem(
      "kidskatalog-kart",
      JSON.stringify({ state: { ids: seedIds }, version: 0 }),
    );
  }, sample);

  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByTestId("open-parent-auth-prompt")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("open-parent-wishlist")).toHaveCount(0);
  await page.getByTestId("open-parent-signup").click();
  await page.waitForURL(/\/p\/sign-up/);
  await dismissSplash(page);

  const email = `kart-auth-${Date.now()}@example.com`;
  await page.getByTestId("parent-email").fill(email);
  await page.getByTestId("parent-password").fill("test-pass-123");
  await page.getByTestId("parent-auth-submit").click();
  await page.waitForURL(
    (url) =>
      url.pathname === "/p" &&
      url.searchParams.get("ids") === "sky-rocket,roar-rex",
  );
  await dismissSplash(page);
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByTestId("parent-auth-gate")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(2);

  // Already signed in on a later entry → birth year required.
  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByTestId("open-parent-wishlist")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("open-parent-wishlist").click();
  await page.waitForURL((url) => url.pathname === "/p");
  await dismissSplash(page);
  await expect(page.getByTestId("parent-birth-year-gate")).toBeVisible();
  await unlockParentGate(page);
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(2);
});

test("deep links stay locked for empty, junk, and out-of-range years", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await signUpViaApi(request, `gate-junk-${Date.now()}@example.com`);

  const posted: string[] = [];
  const logs: string[] = [];
  page.on("request", (req) => {
    posted.push(`${req.method()} ${req.url()} ${req.postData() || ""}`);
  });
  page.on("console", (msg) => {
    logs.push(msg.text());
  });

  await openBirthYearGate(page, "/p/sky-rocket?skip=1&parent=1&unlock=1");
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(0);

  await page.getByTestId("parent-birth-year-submit").click();
  await expect(page.getByTestId("parent-birth-year-error")).toHaveText(
    /enter a valid birth year/i,
  );

  for (const value of ["abc", "19", "1899", "2009"]) {
    await submitYear(page, value);
    await expect(page.getByTestId("parent-birth-year-error")).toBeVisible();
    await expect(page.getByTestId("parent-birth-year-gate")).toBeVisible();
  }

  expect(posted.join("\n")).not.toMatch(/birth[_-]?year/i);
  expect(posted.join("\n")).not.toMatch(/"1899"|"2009"/);
  expect(logs.join("\n")).not.toMatch(/\b(1899|2009)\b/);
});

test("valid year unlocks now; leaving Parent Mode requires the gate again", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await signUpViaApi(request, `gate-again-${Date.now()}@example.com`);

  await openBirthYearGate(page, "/p/sky-rocket");
  await submitYear(page, "1990");
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toBeVisible();

  const stored = await page.evaluate(() => {
    try {
      return sessionStorage.getItem("kk_parent_gate");
    } catch {
      return null;
    }
  });
  expect(stored).toBeNull();

  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);

  await openBirthYearGate(page, "/p/deals");
  await submitYear(page, "2008");
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByText(/Brand deals/i).first()).toBeVisible();

  await openBirthYearGate(page, "/p?ids=sky-rocket,roar-rex");
  await submitYear(page, "1901");
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(2);
});

test("boundary years 1901 and 2008 unlock; Kid Mode never shows the gate", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(90_000);
  await signUpViaApi(request, `gate-bound-${Date.now()}@example.com`);

  await openBirthYearGate(page, "/p");
  await submitYear(page, "1901");
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^Parents$/i })).toBeVisible();

  const other = await context.newPage();
  await other.goto("/p/sign-in", { waitUntil: "domcontentloaded" });
  await dismissSplash(other);
  await expect(other.getByTestId("parent-login-form")).toBeVisible();
  await expect(other.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await other.close();

  const fresh = await context.browser()?.newContext();
  if (!fresh) throw new Error("expected a browser");
  const locked = await fresh.newPage();
  const signup = await fresh.request.post("/api/parent/auth/signup", {
    data: {
      email: `gate-buy-${Date.now()}@example.com`,
      password: "test-pass-123",
    },
  });
  expect(signup.ok()).toBeTruthy();
  await openBirthYearGate(locked, "/p/buy-placeholder?toy=sky-rocket");
  await submitYear(locked, "2008");
  await expect(locked.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(locked.locator("#buy-placeholder")).toBeAttached();
  await fresh.close();

  for (const path of ["/shop", "/kart", "/toy/sky-rocket", "/menu"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
    await expect(page.getByTestId("parent-auth-gate")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /What'?s your birth year\?/i }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Buy on Amazon/i })).toHaveCount(
      0,
    );
  }
});
