import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { FALLBACK_AFFILIATE_TAG, storedParentAffiliateUrl } from "../src/lib/affiliate";
import { resolveParentBuy } from "../src/lib/associates";
import {
  isProposalParseError,
  parseAgeRange,
  parseProposalInput,
} from "../src/lib/proposal";
import { assertLiveToyPublishable, htmlLooksKidClean, kidJsonLooksClean } from "../src/lib/publish-locks";
import { toKidToy } from "../src/lib/kid-surface";
import { resolveBrandDeal } from "../src/lib/brand-deals";
import { seedParentGateUnlock } from "./parent-gate";
import type { Toy } from "../src/types/toy";

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

const ADMIN_PIN = "2114";
const AFFILIATE_LEAK = /[?&]tag=|amazon\.[^"'<\s]+\/(?:dp|gp\/product)\//i;

function sampleToy(partial: Partial<Toy> & Pick<Toy, "id" | "name">): Toy {
  return {
    category: "blocks",
    audience: "all",
    blurb: "Click-together building squares.",
    image: "/categories/blocks.svg",
    imageAlt: "Demo",
    ageMin: 4,
    ageMax: 8,
    color: "#B19CD9",
    affiliateUrl: storedParentAffiliateUrl("B07YNLXJ4L"),
    ...partial,
  };
}

test("proposal parser stores kidskatalog-20 and stages as proposed", () => {
  const parsed = parseProposalInput(
    {
      name: "Mag Tiles",
      blurb: "Click-together building squares.",
      age: "4-8",
      category: "blocks",
      amazonUrl: "https://www.amazon.com/dp/B07YNLXJ4L",
      sourceNotes: "Amazon search demo",
    },
    new Set(),
  );
  expect(isProposalParseError(parsed)).toBeFalsy();
  if (isProposalParseError(parsed)) return;
  expect(parsed.reviewStatus).toBe("proposed");
  expect(parsed.asin).toBe("B07YNLXJ4L");
  expect(parsed.affiliateUrl).toContain(`tag=${FALLBACK_AFFILIATE_TAG}`);
  expect(parsed.ageMin).toBe(4);
  expect(parsed.ageMax).toBe(8);
  expect(parseAgeRange({ age: "5+" })).toEqual({ ageMin: 5, ageMax: 13 });
});

test("Counsel locks: tag= only when LIVE; kid projection stays clean", () => {
  const toy = sampleToy({ id: "sky-rocket", name: "Sky Rocket" });
  const lock = assertLiveToyPublishable(toy);
  expect(lock.ok).toBeTruthy();

  const prevLive = process.env.AMAZON_ASSOCIATES_LIVE;
  const prevTag = process.env.AMAZON_ASSOCIATES_TAG;
  try {
    delete process.env.AMAZON_ASSOCIATES_LIVE;
    delete process.env.AMAZON_ASSOCIATES_TAG;
    const off = resolveParentBuy(toy.id, toy.affiliateUrl);
    expect(off.mode).toBe("placeholder");
    expect(off.href).not.toMatch(AFFILIATE_LEAK);

    process.env.AMAZON_ASSOCIATES_LIVE = "true";
    process.env.AMAZON_ASSOCIATES_TAG = FALLBACK_AFFILIATE_TAG;
    const on = resolveParentBuy(toy.id, toy.affiliateUrl);
    expect(on.mode).toBe("associates");
    expect(on.href).toContain(`tag=${FALLBACK_AFFILIATE_TAG}`);
  } finally {
    if (prevLive === undefined) delete process.env.AMAZON_ASSOCIATES_LIVE;
    else process.env.AMAZON_ASSOCIATES_LIVE = prevLive;
    if (prevTag === undefined) delete process.env.AMAZON_ASSOCIATES_TAG;
    else process.env.AMAZON_ASSOCIATES_TAG = prevTag;
  }

  const kid = toKidToy(toy);
  expect(kidJsonLooksClean(kid)).toBeTruthy();
  expect(kid).not.toHaveProperty("affiliateUrl");
});

test("brand deal CTA cannot resolve to an Amazon Buy URL", () => {
  const toy = sampleToy({
    id: "brand-clash",
    name: "Brand Clash",
    brandDeal: true,
    brandPartner: "Yoto-style",
    brandAffiliate: {
      partner: "Yoto-style",
      live: true,
      url: storedParentAffiliateUrl("B07YNLXJ4L"),
    },
  });
  const lock = assertLiveToyPublishable(toy);
  expect(lock.ok).toBeTruthy();
  expect(resolveBrandDeal(toy)?.href).toBeNull();
});

async function adminLogin(request: APIRequestContext) {
  const res = await request.post("/api/admin/auth", {
    data: { action: "verify", pin: ADMIN_PIN },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

async function cleanupProbe(request: APIRequestContext, id: string) {
  await request.delete(`/api/admin/toys?id=${encodeURIComponent(id)}`);
  await request.delete(`/api/admin/drafts?id=${encodeURIComponent(id)}`);
}

test("ingest is auth-gated and /admin is not a public queue", async ({ request, page }) => {
  const denied = await request.post("/api/admin/proposals", {
    data: {
      name: "Nope",
      amazonUrl: "https://www.amazon.com/dp/B07YNLXJ4L",
    },
  });
  expect(denied.status()).toBe(401);

  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page.getByRole("heading", { name: /Enter Passcode/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit Approval" })).toHaveCount(0);
});

test("ingest → approve stages only → Submit Approval publishes; kid HTML stays clean", async ({
  request,
  page,
}) => {
  test.setTimeout(90_000);
  const id = `kk-queue-probe-${Date.now()}`;
  await adminLogin(request);

  try {
    const ingest = await request.post("/api/admin/proposals", {
      data: {
        id,
        name: "Queue Probe",
        blurb: "Queue path proof card.",
        images: ["/categories/blocks.svg"],
        age: "4-8",
        category: "blocks",
        amazonUrl: "https://www.amazon.com/dp/B07YNLXJ4L",
        affiliateUrl: "https://www.amazon.com/dp/B07YNLXJ4L?tag=other-tag-20",
        sourceNotes: "ticket kk-toy-approval-queue-2026-09-21",
      },
    });
    expect(ingest.status(), await ingest.text()).toBe(201);
    const ingested = (await ingest.json()) as {
      proposals: Array<{ id: string; reviewStatus?: string; affiliateUrl?: string }>;
    };
    expect(ingested.proposals[0]?.id).toBe(id);
    expect(ingested.proposals[0]?.reviewStatus).toBe("proposed");
    expect(ingested.proposals[0]?.affiliateUrl).toContain(`tag=${FALLBACK_AFFILIATE_TAG}`);

    const catalogBefore = await request.get(`/api/catalog?ids=${id}`);
    const beforeJson = (await catalogBefore.json()) as { toys: Array<{ id: string }> };
    expect(beforeJson.toys.some((t) => t.id === id)).toBeFalsy();

    const submitEarly = await request.post("/api/admin/drafts/submit-approval", {
      data: { ids: [id] },
    });
    expect(submitEarly.ok()).toBeTruthy();
    const earlyJson = (await submitEarly.json()) as {
      count: number;
      skipped: Array<{ id: string }>;
    };
    expect(earlyJson.count).toBe(0);
    expect(earlyJson.skipped.some((s) => s.id === id)).toBeTruthy();

    const approve = await request.post("/api/admin/drafts/approve", {
      data: { id },
    });
    expect(approve.ok(), await approve.text()).toBeTruthy();
    const stillDraft = await request.get("/api/admin/drafts");
    const drafts = (await stillDraft.json()) as {
      drafts: Array<{ id: string; reviewStatus?: string }>;
    };
    expect(drafts.drafts.find((d) => d.id === id)?.reviewStatus).toBe("approved");

    const catalogStaged = await request.get(`/api/catalog?ids=${id}`);
    const stagedJson = (await catalogStaged.json()) as { toys: Array<{ id: string }> };
    expect(stagedJson.toys.some((t) => t.id === id)).toBeFalsy();

    const submit = await request.post("/api/admin/drafts/submit-approval", {
      data: {},
    });
    expect(submit.ok(), await submit.text()).toBeTruthy();
    const submitted = (await submit.json()) as { count: number; published: Array<{ id: string }> };
    expect(submitted.published.some((t) => t.id === id)).toBeTruthy();

    const catalog = await request.get(`/api/catalog?ids=${id}`);
    const catalogJson = (await catalog.json()) as { toys: Array<{ id: string }> };
    expect(catalogJson.toys.map((t) => t.id)).toContain(id);
    expect(kidJsonLooksClean(catalogJson)).toBeTruthy();
    expect(JSON.stringify(catalogJson)).not.toMatch(AFFILIATE_LEAK);

    const kidPage = await request.get(`/toy/${id}`);
    expect(kidPage.ok()).toBeTruthy();
    const kidHtml = await kidPage.text();
    expect(htmlLooksKidClean(kidHtml)).toBeTruthy();

    const parentPage = await request.get(`/p/${id}`);
    expect(parentPage.ok()).toBeTruthy();
    const parentHtml = await parentPage.text();
    expect(parentHtml).toContain("parent-birth-year-gate");
    expect(parentHtml).toMatch(/\/p\/buy-placeholder\?toy=/);
    expect(parentHtml).not.toMatch(AFFILIATE_LEAK);

    const buy = await request.get(`/api/parent/buy-urls?ids=${id}`);
    const buyJson = (await buy.json()) as { urls: Record<string, string> };
    expect(buyJson.urls[id]).toMatch(/\/p\/buy-placeholder\?toy=/);
    expect(JSON.stringify(buyJson)).not.toMatch(AFFILIATE_LEAK);

    await seedParentGateUnlock(page);
    await page.goto(`/p/${id}`, { waitUntil: "domcontentloaded" });
    await dismissSplash(page);
    await expect(page.getByTestId("parent-buy-cluster")).toBeVisible();
    await expect(page.getByTestId("parent-buy-cta")).toBeVisible();
    await expect(page.getByTestId("associates-disclosure")).toBeVisible();
    await expect(page.getByText(/Amazon Services LLC Associates Program/i)).toBeVisible();
    await expect(page.getByTestId("parent-buy-cta")).toHaveAttribute(
      "href",
      /\/p\/buy-placeholder\?toy=/,
    );
    await expect(page.getByTestId("brand-affiliate-cta")).toHaveCount(0);
  } finally {
    await cleanupProbe(request, id);
  }
});

test("reject drops a proposal", async ({ request }) => {
  const id = `kk-queue-reject-${Date.now()}`;
  await adminLogin(request);
  try {
    const ingest = await request.post("/api/admin/proposals", {
      data: {
        id,
        name: "Reject Probe",
        amazonUrl: "B00JHDC0K6",
        category: "games",
      },
    });
    expect(ingest.status()).toBe(201);
    const reject = await request.post("/api/admin/drafts/reject", { data: { id } });
    expect(reject.ok()).toBeTruthy();
    const drafts = await request.get("/api/admin/drafts");
    const json = (await drafts.json()) as { drafts: Array<{ id: string }> };
    expect(json.drafts.some((d) => d.id === id)).toBeFalsy();
  } finally {
    await cleanupProbe(request, id);
  }
});
