import { test, expect, type Page } from "@playwright/test";
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

test("parent can sign up, save a list, and reopen it after reload", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const email = `pw-${Date.now()}@example.com`;
  const password = "test-pass-123";

  await page.goto("/p?ids=sky-rocket,roar-rex", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await unlockParentGate(page);

  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(2);
  await expect(page.getByTestId("parent-save-list")).toBeVisible();
  await expect(page.getByTestId("save-list-signup")).toBeVisible();

  await page.getByTestId("save-list-signup").click();
  await page.waitForURL(/\/p\/sign-up/);
  await dismissSplash(page);
  await unlockParentGate(page);

  await expect(page.getByTestId("parent-signup-form")).toBeVisible();
  await page.getByTestId("parent-email").fill(email);
  await page.getByTestId("parent-password").fill(password);
  await page.getByTestId("parent-auth-submit").click();
  await page.waitForURL(
    (url) => url.pathname === "/p" && url.searchParams.get("ids") === "sky-rocket,roar-rex",
  );
  await dismissSplash(page);
  await dismissSplash(page);
  await unlockParentGate(page);
  await page.waitForFunction(() => !document.documentElement.dataset.splash).catch(() => undefined);
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByTestId("parent-profile-icon")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("parent-signout-footer")).toBeVisible();
  await expect(page.getByTestId("my-lists-link")).toHaveCount(0);
  await page.getByTestId("save-list-name").fill("Park toys");
  await page.getByTestId("save-list-button").click();
  await expect(page.getByText(/Saved/i)).toBeVisible();

  await page.getByTestId("open-saved-list").click();
  await page.waitForURL(/[?&]list=lst_/);
  await dismissSplash(page);
  await unlockParentGate(page);
  await expect(page.getByText(/Park toys/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(2);

  await page.goto("/p/lists", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await unlockParentGate(page);
  await expect(page.getByTestId("saved-lists")).toBeVisible();
  await expect(page.getByText("Park toys")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await unlockParentGate(page);
  await expect(page.getByText("Park toys")).toBeVisible();

  const savedHref = await page.getByTestId("open-saved-list-row").getAttribute("href");
  expect(savedHref).toMatch(/\/p\/lists\/lst_/);
  await page.goto(savedHref!, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/[?&]list=lst_/);
  await dismissSplash(page);
  await unlockParentGate(page);
  await expect(page.getByText(/Park toys/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy on Amazon" })).toHaveCount(2);

  await page.getByTestId("parent-signout").click();
  await page.waitForURL(/\/p/);
  await dismissSplash(page);
  await unlockParentGate(page);
  await expect(page.getByTestId("parent-login-link")).toBeVisible();
  await expect(page.getByTestId("parent-signout-footer")).toHaveCount(0);

  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByTestId("parent-signup-link")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Buy on Amazon/i })).toHaveCount(0);
});

test("saved list API requires a parent session", async ({ request }) => {
  const unauth = await request.get("/api/parent/lists");
  expect(unauth.status()).toBe(401);

  const email = `api-${Date.now()}@example.com`;
  const signup = await request.post("/api/parent/auth/signup", {
    data: { email, password: "test-pass-123" },
  });
  expect(signup.ok()).toBeTruthy();

  const created = await request.post("/api/parent/lists", {
    data: { name: "API list", toyIds: ["sky-rocket"] },
  });
  expect(created.ok()).toBeTruthy();
  const createdJson = (await created.json()) as { list: { id: string } };
  expect(createdJson.list.id).toMatch(/^lst_/);

  const listed = await request.get("/api/parent/lists");
  const listedJson = (await listed.json()) as {
    lists: Array<{ name: string; toyIds: string[] }>;
  };
  expect(listedJson.lists.some((row) => row.name === "API list")).toBeTruthy();

  const opened = await request.get(`/api/parent/lists/${createdJson.list.id}`);
  expect(opened.ok()).toBeTruthy();
});
