import { test, expect, type Page } from "@playwright/test";
import {
  isAllowedParentBirthYear,
  PARENT_BIRTH_YEAR_MAX,
  PARENT_BIRTH_YEAR_MIN,
} from "../src/lib/parent-birth-year";
import { unlockParentGate } from "./parent-gate";

async function dismissSplash(page: Page) {
  const tap = page.getByRole("button", { name: /Tap to start KidsKatalog/i });
  try {
    await tap.waitFor({ state: "visible", timeout: 8000 });
    await tap.click();
    await tap.waitFor({ state: "hidden", timeout: 15_000 });
  } catch {
    // Already dismissed or not a cold open.
  }
}

async function openLockedParent(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByTestId("parent-birth-year-gate")).toBeVisible();
  await expect(page.getByRole("heading", { name: /What'?s your birth year\?/i })).toBeVisible();
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

test("deep links stay locked for empty, junk, and out-of-range years", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const posted: string[] = [];
  const logs: string[] = [];
  page.on("request", (req) => {
    posted.push(`${req.method()} ${req.url()} ${req.postData() || ""}`);
  });
  page.on("console", (msg) => {
    logs.push(msg.text());
  });

  await openLockedParent(page, "/p/sky-rocket?skip=1&parent=1&unlock=1");
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /skip/i })).toHaveCount(0);

  await page.getByTestId("parent-birth-year-submit").click();
  await expect(page.getByTestId("parent-birth-year-error")).toHaveText(
    /enter a valid birth year/i,
  );
  await expect(page.getByTestId("parent-birth-year-gate")).toBeVisible();

  for (const value of ["abc", "19", "1899", "2009"]) {
    await submitYear(page, value);
    await expect(page.getByTestId("parent-birth-year-error")).toBeVisible();
    await expect(page.getByTestId("parent-birth-year-gate")).toBeVisible();
    await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(0);
  }

  expect(posted.join("\n")).not.toMatch(/birth[_-]?year/i);
  expect(posted.join("\n")).not.toMatch(/"1899"|"2009"/);
  expect(logs.join("\n")).not.toMatch(/\b(1899|2009)\b/);
});

test("valid year unlocks now; leaving Parent Mode requires the gate again", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await openLockedParent(page, "/p/sky-rocket");
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
  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === "kk_parent_gate")).toBeFalsy();
  expect(cookies.some((cookie) => cookie.value === "1990")).toBeFalsy();

  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);

  await openLockedParent(page, "/p/deals");
  await expect(page.getByText(/Brand deals/i)).toHaveCount(0);
  await submitYear(page, "2008");
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByText(/Brand deals/i).first()).toBeVisible();

  await openLockedParent(page, "/p?ids=sky-rocket,roar-rex");
  await submitYear(page, "1901");
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(2);
});

test("boundary years 1901 and 2008 unlock; Kid Mode never shows the gate", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);

  await openLockedParent(page, "/p");
  await submitYear(page, "1901");
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^Parents$/i })).toBeVisible();

  const other = await context.newPage();
  await openLockedParent(other, "/p/sign-in");
  await submitYear(other, "1990");
  await expect(other.getByTestId("parent-login-form")).toBeVisible();
  await other.close();

  const fresh = await context.browser()?.newContext();
  if (!fresh) throw new Error("expected a browser");
  const locked = await fresh.newPage();
  await openLockedParent(locked, "/p/buy-placeholder?toy=sky-rocket");
  await submitYear(locked, "2008");
  await expect(locked.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(locked.locator("#buy-placeholder")).toBeAttached();
  await fresh.close();

  for (const path of ["/shop", "/kart", "/toy/sky-rocket", "/menu"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /What'?s your birth year\?/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Buy on Amazon/i })).toHaveCount(0);
  }
});

test("Open Parent Mode from Kart always hits the birth-year gate", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(90_000);
  const catalog = await request.get("/api/catalog?ids=sky-rocket,roar-rex");
  expect(catalog.ok()).toBeTruthy();
  const sample = ["sky-rocket", "roar-rex"];
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => undefined);
  await page.addInitScript((seedIds: string[]) => {
    localStorage.setItem(
      "kidskatalog-kart",
      JSON.stringify({ state: { ids: seedIds }, version: 0 }),
    );
  }, sample);

  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await page.getByTestId("open-parent-wishlist").click();
  await page.waitForURL((url) => url.pathname === "/p");
  await dismissSplash(page);
  await expect(page.getByTestId("parent-birth-year-gate")).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(0);

  await unlockParentGate(page);
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(2);

  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await page.getByTestId("open-parent-wishlist").click();
  await page.waitForURL((url) => url.pathname === "/p");
  await dismissSplash(page);
  await expect(page.getByTestId("parent-birth-year-gate")).toBeVisible();
});
