import { test, expect, type Page } from "@playwright/test";
import {
  isAllowedParentBirthYear,
  PARENT_BIRTH_YEAR_MAX,
  PARENT_BIRTH_YEAR_MIN,
  PARENT_GATE_COOKIE,
  PARENT_GATE_STORAGE_KEY,
  PARENT_GATE_UNLOCKED_FLAG,
} from "../src/lib/parent-birth-year";

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
    /1901 and 2008/i,
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

test("1901, 1990, and 2008 unlock Parent Mode for the browser session", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await openLockedParent(page, "/p/sky-rocket");
  await submitYear(page, "1990");
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toBeVisible();

  const stored = await page.evaluate((key) => sessionStorage.getItem(key), PARENT_GATE_STORAGE_KEY);
  expect(stored).toBe(PARENT_GATE_UNLOCKED_FLAG);
  const cookies = await page.context().cookies();
  expect(
    cookies.some(
      (cookie) =>
        cookie.name === PARENT_GATE_COOKIE &&
        cookie.value === PARENT_GATE_UNLOCKED_FLAG &&
        cookie.expires === -1,
    ),
  ).toBeTruthy();
  expect(cookies.some((cookie) => cookie.value === "1990")).toBeFalsy();

  await page.goto("/p/deals", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByText(/Brand deals/i).first()).toBeVisible();

  await page.goto("/p?ids=sky-rocket,roar-rex", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
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
  await expect(page.getByRole("heading", { name: /Parent wish list/i })).toBeVisible();

  const other = await context.newPage();
  await other.goto("/p/sign-in", { waitUntil: "domcontentloaded" });
  await dismissSplash(other);
  await expect(other.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(other.getByTestId("parent-login-form")).toBeVisible();
  await other.close();

  const fresh = await context.browser()?.newContext();
  if (!fresh) throw new Error("expected a browser");
  const locked = await fresh.newPage();
  await locked.goto("/p/buy-placeholder?toy=sky-rocket", {
    waitUntil: "domcontentloaded",
  });
  await dismissSplash(locked);
  await expect(locked.getByTestId("parent-birth-year-gate")).toBeVisible();
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
