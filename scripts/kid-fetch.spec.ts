import { test, expect, type Page } from "@playwright/test";
import { KID_TRY_AGAIN, readKidJson } from "../src/lib/kid-fetch";
import { pairStoreMissing } from "../src/lib/pair-store-status";

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

test("kids responses skip json() on empty and non-json bodies", async () => {
  const empty = await readKidJson(new Response(null, { status: 500 }));
  expect(empty.ok).toBeFalsy();
  if (!empty.ok) expect(empty.message).toBe(KID_TRY_AGAIN);

  const html = await readKidJson(
    new Response("<html></html>", {
      status: 500,
      headers: { "content-type": "text/html" },
    }),
  );
  expect(html.ok).toBeFalsy();

  const ready = await readKidJson(
    new Response(JSON.stringify({ error: "Service not ready" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    }),
  );
  expect(ready.ok).toBeFalsy();
  if (!ready.ok) expect(ready.message).toBe(KID_TRY_AGAIN);

  const ok = await readKidJson<{ code: string }>(
    new Response(JSON.stringify({ code: "ABCD2345" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  expect(ok.ok).toBeTruthy();
  if (ok.ok) expect(ok.data.code).toBe("ABCD2345");
});

test("a missing shared store is not a bad pair token", () => {
  expect(
    pairStoreMissing({
      nodeEnv: "production",
      tursoConfigured: false,
      blobConfigured: false,
    }),
  ).toBeTruthy();
  expect(
    pairStoreMissing({
      nodeEnv: "production",
      tursoConfigured: true,
      blobConfigured: false,
    }),
  ).toBeFalsy();
  expect(
    pairStoreMissing({
      nodeEnv: "development",
      tursoConfigured: false,
      blobConfigured: false,
    }),
  ).toBeFalsy();
});

test("show a grown-up hides an empty handoff failure", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-kart",
      JSON.stringify({ state: { ids: ["stem-magnets"] }, version: 0 }),
    );
  });
  await page.route("**/api/kids/handoff", (route) =>
    route.fulfill({ status: 500, body: "", headers: { "content-type": "text/plain" } }),
  );
  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await page.getByTestId("show-grownup").click();
  await expect(page.getByText(KID_TRY_AGAIN)).toBeVisible();
  await expect(page.getByText(/Unexpected end of JSON input/i)).toHaveCount(0);
  await expect(page.getByTestId("handoff-result")).toHaveCount(0);
});
