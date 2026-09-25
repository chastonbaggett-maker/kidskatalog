import { test, expect, type Page } from "@playwright/test";
import {
  canonicalizeSiteOrigin,
  DEFAULT_SITE_ORIGIN,
  isUnconfiguredCustomHost,
} from "../src/lib/site-url";

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

test("canonicalizeSiteOrigin uses kidskatalog.com and leaves preview hosts", () => {
  expect(DEFAULT_SITE_ORIGIN).toBe("https://kidskatalog.com");
  expect(isUnconfiguredCustomHost("kidskatalog.app")).toBeTruthy();
  expect(isUnconfiguredCustomHost("https://www.kidskatalog.app/p")).toBeTruthy();
  expect(isUnconfiguredCustomHost("https://kidskatalog.vercel.app")).toBeFalsy();
  expect(canonicalizeSiteOrigin("https://kidskatalog.app")).toBe(DEFAULT_SITE_ORIGIN);
  expect(canonicalizeSiteOrigin("kidskatalog.app")).toBe(DEFAULT_SITE_ORIGIN);
  expect(canonicalizeSiteOrigin("https://www.kidskatalog.app")).toBe(DEFAULT_SITE_ORIGIN);
  expect(canonicalizeSiteOrigin("https://www.kidskatalog.com")).toBe(
    "https://kidskatalog.com",
  );
  expect(canonicalizeSiteOrigin("https://kidskatalog.vercel.app")).toBe(
    "https://kidskatalog.com",
  );
  expect(canonicalizeSiteOrigin("https://kidskatalog.vercel.app/")).toBe(
    "https://kidskatalog.com",
  );
  expect(canonicalizeSiteOrigin("http://localhost:3456")).toBe("http://localhost:3456");
  expect(canonicalizeSiteOrigin("https://preview.vercel.app")).toBe(
    "https://preview.vercel.app",
  );
  expect(
    canonicalizeSiteOrigin("https://kidskatalog-git-cursor-parent.vercel.app"),
  ).toBe("https://kidskatalog-git-cursor-parent.vercel.app");
});

test("Kart handoff points at the parent claim page, not kidskatalog.app", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "kidskatalog-kart",
      JSON.stringify({ state: { ids: ["sky-rocket"] }, version: 0 }),
    );
  });
  await page.goto("/kart", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await page.getByTestId("show-grownup").click();
  const handoff = page.getByTestId("handoff-link");
  await expect(handoff).toBeVisible();
  const value = (await handoff.getAttribute("href")) || "";
  expect(value).toContain("/claim/");
  expect(value).not.toContain("://kidskatalog.app");
  expect(value).not.toContain("://www.kidskatalog.app");
  expect(value).not.toMatch(/amazon\.com/i);
});
