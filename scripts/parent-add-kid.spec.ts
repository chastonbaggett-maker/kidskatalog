import { test, expect, type Page } from "@playwright/test";
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

test("parent can add a kid list with name and gender mode", async ({ page }) => {
  test.setTimeout(90_000);
  const email = `kid-${Date.now()}@example.com`;
  const password = "test-pass-123";

  await page.goto("/p", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByTestId("parent-auth-gate")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("parent-auth-gate-signup").click();
  await page.waitForURL(/\/p\/sign-up/);
  await dismissSplash(page);

  await page.getByTestId("parent-email").fill(email);
  await page.getByTestId("parent-password").fill(password);
  await page.getByTestId("parent-auth-submit").click();
  await page.waitForURL((url) => url.pathname === "/p");
  await dismissSplash(page);
  await expect(page.getByTestId("parent-birth-year-gate")).toHaveCount(0);
  await expect(page.getByTestId("parent-profile-icon")).toBeVisible({
    timeout: 20_000,
  });

  await page.getByTestId("add-kid-open").click();
  await page.getByTestId("add-kid-name").fill("Milo");
  await page.getByTestId("add-kid-gender-boys").click();
  await page.getByTestId("add-kid-submit").click();

  await page.waitForURL(/[?&]list=lst_/);
  await dismissSplash(page);
  // Soft nav keeps layout unlocked after auth bypass.
  await expect(page.getByText(/Milo/i).first()).toBeVisible();
  await expect(page.getByText(/empty list|No toys on Milo/i).first()).toBeVisible();
  await expect
    .poll(async () => page.locator("html").getAttribute("data-accent"))
    .toBe("boys");

  await page.goto("/p/lists", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await unlockParentGate(page);
  await expect(page.getByTestId("saved-lists")).toBeVisible();
  await expect(page.getByText("Milo")).toBeVisible();
  await expect(page.getByText(/Boys/i).first()).toBeVisible();
});

test("add kid API creates empty list with audience", async ({ request }) => {
  const email = `kid-api-${Date.now()}@example.com`;
  const signup = await request.post("/api/parent/auth/signup", {
    data: { email, password: "test-pass-123" },
  });
  expect(signup.ok()).toBeTruthy();

  const created = await request.post("/api/parent/lists", {
    data: { name: "Ava", audience: "girls", toyIds: [] },
  });
  expect(created.ok()).toBeTruthy();
  const createdJson = (await created.json()) as {
    list: { id: string; name: string; audience: string; toyIds: string[] };
  };
  expect(createdJson.list.id).toMatch(/^lst_/);
  expect(createdJson.list.name).toBe("Ava");
  expect(createdJson.list.audience).toBe("girls");
  expect(createdJson.list.toyIds).toEqual([]);

  const opened = await request.get(`/api/parent/lists/${createdJson.list.id}`);
  expect(opened.ok()).toBeTruthy();
  const openedJson = (await opened.json()) as {
    list: { audience: string; toyIds: string[] };
  };
  expect(openedJson.list.audience).toBe("girls");
  expect(openedJson.list.toyIds).toEqual([]);
});
