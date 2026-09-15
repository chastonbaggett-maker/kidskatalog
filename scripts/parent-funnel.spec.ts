import { test, expect, type Page } from "@playwright/test";
import { sanitizeParentFunnelEvent } from "../src/lib/parent-funnel";

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

test("funnel sanitizer drops PII and Amazon tags", () => {
  expect(
    sanitizeParentFunnelEvent({
      name: "parent_toy_view",
      toyId: "sky-rocket",
      tag: "secret-tag-20",
      email: "dad@example.com",
      href: "https://www.amazon.com/dp/B0EXAMPLE?tag=secret-tag-20",
    }),
  ).toEqual({ name: "parent_toy_view", toyId: "sky-rocket" });

  expect(
    sanitizeParentFunnelEvent({
      name: "parent_buy_click",
      toyId: "sky-rocket?tag=nope",
    }),
  ).toBeNull();

  expect(sanitizeParentFunnelEvent({ name: "parent_toy_view" })).toBeNull();
  expect(sanitizeParentFunnelEvent({ name: "kart_add", toyId: "sky-rocket" })).toBeNull();
});

test("POST /api/events accepts allowlisted parent events and rejects junk", async ({
  request,
}) => {
  const before = await request.get("/api/events");
  expect(before.ok()).toBeTruthy();
  const beforeJson = (await before.json()) as {
    totals: { parent_toy_view: number; parent_buy_click: number };
  };

  const view = await request.post("/api/events", {
    data: { name: "parent_toy_view", toyId: "sky-rocket" },
  });
  expect(view.ok()).toBeTruthy();

  const buy = await request.post("/api/events", {
    data: {
      name: "parent_buy_click",
      toyId: "sky-rocket",
      mode: "placeholder",
      tag: "should-not-be-stored",
    },
  });
  expect(buy.ok()).toBeTruthy();

  const leak = await request.post("/api/events", {
    data: {
      name: "parent_buy_click",
      toyId: "https://www.amazon.com/dp/B0X?tag=kidskatalog-20",
    },
  });
  expect(leak.status()).toBe(400);

  const after = await request.get("/api/events");
  const afterJson = (await after.json()) as {
    totals: { parent_toy_view: number; parent_buy_click: number };
  };
  expect(afterJson.totals.parent_toy_view).toBeGreaterThanOrEqual(
    beforeJson.totals.parent_toy_view + 1,
  );
  expect(afterJson.totals.parent_buy_click).toBeGreaterThanOrEqual(
    beforeJson.totals.parent_buy_click + 1,
  );
  expect(JSON.stringify(afterJson)).not.toMatch(/[?&]tag=/i);
  expect(JSON.stringify(afterJson)).not.toMatch(/amazon\.com/i);
});

test("parent toy, wish list, Buy, and brand-deal CTAs POST funnel events", async ({
  page,
}) => {
  test.setTimeout(90_000);

  const toyView = page.waitForRequest(
    (req) =>
      req.url().includes("/api/events") &&
      req.method() === "POST" &&
      (req.postData() || "").includes('"parent_toy_view"'),
  );
  await page.goto("/p/sky-rocket", { waitUntil: "domcontentloaded" });
  const toyBody = JSON.parse((await toyView).postData() || "{}") as {
    name: string;
    toyId: string;
  };
  expect(toyBody).toMatchObject({ name: "parent_toy_view", toyId: "sky-rocket" });
  expect(JSON.stringify(toyBody)).not.toMatch(/[?&]tag=/i);

  await dismissSplash(page);

  const buyClick = page.waitForRequest(
    (req) =>
      req.url().includes("/api/events") &&
      req.method() === "POST" &&
      (req.postData() || "").includes('"parent_buy_click"'),
  );
  await page.getByRole("link", { name: "Buy on Amazon" }).click();
  const buyBody = JSON.parse((await buyClick).postData() || "{}") as {
    name: string;
    toyId: string;
    mode: string;
  };
  expect(buyBody).toMatchObject({
    name: "parent_buy_click",
    toyId: "sky-rocket",
    mode: "placeholder",
  });
  expect(JSON.stringify(buyBody)).not.toMatch(/amazon\.com/i);

  const listView = page.waitForRequest(
    (req) =>
      req.url().includes("/api/events") &&
      req.method() === "POST" &&
      (req.postData() || "").includes('"parent_wishlist_view"'),
  );
  await page.goto("/p?ids=sky-rocket,roar-rex", { waitUntil: "domcontentloaded" });
  const listBody = JSON.parse((await listView).postData() || "{}") as {
    name: string;
    toyCount: number;
  };
  expect(listBody.name).toBe("parent_wishlist_view");
  expect(listBody.toyCount).toBe(2);

  const dealClick = page.waitForRequest(
    (req) =>
      req.url().includes("/api/events") &&
      req.method() === "POST" &&
      (req.postData() || "").includes('"parent_brand_deal_click"'),
  );
  await page.goto("/p/deals", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  page.on("popup", (popup) => {
    void popup.close();
  });
  await page
    .locator('a[href="https://example.com/kidskatalog-brand-deal-placeholder"]')
    .click();
  const dealBody = JSON.parse((await dealClick).postData() || "{}") as {
    name: string;
    toyId: string;
    source: string;
  };
  expect(dealBody).toMatchObject({
    name: "parent_brand_deal_click",
    toyId: "roar-rex",
    source: "deals",
  });
});

test("kid shop and toy pages do not POST parent funnel events", async ({ page }) => {
  const leaked: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/api/events")) {
      leaked.push(req.postData() || "");
    }
  });

  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await page.goto("/toy/sky-rocket", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await page.waitForTimeout(800);
  expect(leaked).toEqual([]);
});
