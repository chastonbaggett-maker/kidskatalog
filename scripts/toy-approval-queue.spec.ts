import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { FALLBACK_AFFILIATE_TAG, storedParentAffiliateUrl } from "../src/lib/affiliate";
import { parseAsin, parseBulkAmazonInputs } from "../src/lib/amazon-asin";
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

test("proposal parser stores kidskatalog-20 and stages as pending", () => {
  const parsed = parseProposalInput(
    {
      name: "Mag Tiles",
      blurb: "Click-together building squares.",
      age: "4-8",
      category: "blocks",
      amazon_url: "https://www.amazon.com/dp/B07YNLXJ4L",
      notes: "Amazon search demo",
      source: "chief",
      source_ref: "demo",
    },
    new Set(),
  );
  expect(isProposalParseError(parsed)).toBeFalsy();
  if (isProposalParseError(parsed)) return;
  expect(parsed.reviewStatus).toBe("pending");
  expect(parsed.asin).toBe("B07YNLXJ4L");
  expect(parsed.affiliateUrl).toContain(`tag=${FALLBACK_AFFILIATE_TAG}`);
  expect(parsed.ageMin).toBe(4);
  expect(parsed.ageMax).toBe(8);
  expect(parsed.source).toBe("chief");
  expect(parsed.sourceRef).toBe("demo");
  expect(parseAgeRange({ age: "5+" })).toEqual({ ageMin: 5, ageMax: 13 });

  expect(parseAsin("https://www.amazon.com/dp/B07YNLXJ4L?tag=kidskatalog-20")).toBe(
    "B07YNLXJ4L",
  );
  expect(
    parseAsin(
      "https://www.amazon.com/Magna-Tiles/dp/B07YNLXJ4L/ref=sr_1_1?tag=kidskatalog-20&linkCode=sl1",
    ),
  ).toBe("B07YNLXJ4L");
  expect(parseAsin("https://www.amazon.com/gp/aw/d/B00JHDC0K6/?tag=kidskatalog-20")).toBe(
    "B00JHDC0K6",
  );
  expect(
    parseAsin("https://www.amazon.com/gp/product/B00005LBVS?creativeASIN=B00005LBVS&tag=kidskatalog-20"),
  ).toBe("B00005LBVS");
  expect(parseAsin("www.amazon.com/dp/B08GTYHNDM?tag=kidskatalog-20")).toBe("B08GTYHNDM");
  const bulk = parseBulkAmazonInputs(
    "https://amzn.to/3abc\nhttps://www.amazon.com/gp/aw/d/B00JHDC0K6/?tag=kidskatalog-20",
  );
  expect(bulk.asins).toEqual(["B00JHDC0K6"]);
  expect(bulk.invalid.some((token) => token.includes("amzn.to"))).toBeTruthy();

  const missingAmazon = parseProposalInput(
    {
      name: "No Amazon",
      affiliate_url: "https://www.amazon.com/dp/B07YNLXJ4L?tag=other-20",
    },
    new Set(),
  );
  expect(isProposalParseError(missingAmazon)).toBeTruthy();
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

test("ingest is auth-gated and /admin/toys is not a public queue", async ({ request, page }) => {
  const denied = await request.post("/api/admin/toy-proposals", {
    data: {
      name: "Nope",
      amazon_url: "https://www.amazon.com/dp/B07YNLXJ4L",
    },
  });
  expect(denied.status()).toBe(401);

  await page.goto("/admin/toys", { waitUntil: "domcontentloaded" });
  await dismissSplash(page);
  await expect(page).toHaveURL(/\/admin(\?|$)/);
  await expect(page.getByRole("heading", { name: /Enter Passcode/i })).toBeVisible();
  await expect(page.getByTestId("submit-approval")).toHaveCount(0);
});

test("ingest → approve stages only → Submit Approval publishes; kid HTML stays clean", async ({
  request,
  page,
}) => {
  test.setTimeout(90_000);
  const id = `kk-queue-probe-${Date.now()}`;
  await adminLogin(request);

  try {
    const ingest = await request.post("/api/admin/toy-proposals", {
      data: {
        source: "playwright",
        source_ref: "kk-toy-approval-queue-2026-09-21",
        id,
        name: "Queue Probe",
        blurb: "Queue path proof card.",
        images: ["/categories/blocks.svg"],
        age: "4-8",
        category: "blocks",
        asin: "B0KKQUEUE1",
        amazon_url: "https://www.amazon.com/dp/B0KKQUEUE1",
        affiliate_url: "https://www.amazon.com/dp/B0KKQUEUE1?tag=other-tag-20",
        notes: "ticket kk-toy-approval-queue-2026-09-21",
      },
    });
    expect(ingest.status(), await ingest.text()).toBe(201);
    const ingested = (await ingest.json()) as {
      proposals: Array<{ id: string; reviewStatus?: string; affiliateUrl?: string }>;
    };
    expect(ingested.proposals[0]?.id).toBe(id);
    expect(ingested.proposals[0]?.reviewStatus).toBe("pending");
    expect(ingested.proposals[0]?.affiliateUrl).toContain(`tag=${FALLBACK_AFFILIATE_TAG}`);

    const pending = await request.get("/api/admin/toy-proposals?status=pending");
    const pendingJson = (await pending.json()) as { proposals: Array<{ id: string }> };
    expect(pendingJson.proposals.some((t) => t.id === id)).toBeTruthy();

    const catalogBefore = await request.get(`/api/catalog?ids=${id}`);
    const beforeJson = (await catalogBefore.json()) as { toys: Array<{ id: string }> };
    expect(beforeJson.toys.some((t) => t.id === id)).toBeFalsy();

    const submitEarly = await request.post("/api/admin/toy-proposals/submit", {
      data: { ids: [id] },
    });
    expect(submitEarly.ok()).toBeTruthy();
    const earlyJson = (await submitEarly.json()) as {
      count: number;
      skipped: Array<{ id: string }>;
    };
    expect(earlyJson.count).toBe(0);
    expect(earlyJson.skipped.some((s) => s.id === id)).toBeTruthy();

    const approve = await request.post(`/api/admin/toy-proposals/${id}/approve`);
    expect(approve.ok(), await approve.text()).toBeTruthy();
    const staged = await request.get("/api/admin/toy-proposals?status=staged");
    const stagedList = (await staged.json()) as {
      proposals: Array<{ id: string; reviewStatus?: string }>;
    };
    expect(stagedList.proposals.find((d) => d.id === id)?.reviewStatus).toBe("staged");

    const catalogStaged = await request.get(`/api/catalog?ids=${id}`);
    const stagedJson = (await catalogStaged.json()) as { toys: Array<{ id: string }> };
    expect(stagedJson.toys.some((t) => t.id === id)).toBeFalsy();

    const submit = await request.post("/api/admin/toy-proposals/submit", {
      data: {},
    });
    expect(submit.ok(), await submit.text()).toBeTruthy();
    const submitted = (await submit.json()) as { count: number; published: Array<{ id: string }> };
    expect(submitted.published.some((t) => t.id === id)).toBeTruthy();

    const published = await request.get("/api/admin/toy-proposals?status=published");
    const publishedJson = (await published.json()) as { proposals: Array<{ id: string }> };
    expect(publishedJson.proposals.some((t) => t.id === id)).toBeTruthy();

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

test("reject keeps an audit row and dedupes ASINs in a batch", async ({ request }) => {
  const id = `kk-queue-reject-${Date.now()}`;
  await adminLogin(request);
  try {
    const ingest = await request.post("/api/admin/toy-proposals", {
      data: {
        source: "playwright",
        id,
        name: "Reject Probe",
        asin: "B0KKREJCT1",
        category: "games",
      },
    });
    expect(ingest.status()).toBe(201);

    const dup = await request.post("/api/admin/toy-proposals", {
      data: {
        name: "Reject Probe Dup",
        asin: "B0KKREJCT1",
        category: "games",
      },
    });
    expect(dup.status()).toBe(400);
    const dupJson = (await dup.json()) as { skipped?: Array<{ error: string }> };
    expect(dupJson.skipped?.some((s) => s.error === "duplicate ASIN")).toBeTruthy();

    const oversize = await request.post("/api/admin/toy-proposals", {
      data: {
        proposals: Array.from({ length: 26 }, (_, i) => ({
          name: `Too Many ${i}`,
          asin: "B07YNLXJ4L",
        })),
      },
    });
    expect(oversize.status()).toBe(400);

    const reject = await request.post(`/api/admin/toy-proposals/${id}/reject`);
    expect(reject.ok()).toBeTruthy();
    const pending = await request.get("/api/admin/toy-proposals?status=pending");
    const pendingJson = (await pending.json()) as { proposals: Array<{ id: string }> };
    expect(pendingJson.proposals.some((t) => t.id === id)).toBeFalsy();
    const rejected = await request.get("/api/admin/toy-proposals?status=rejected");
    const rejectedJson = (await rejected.json()) as {
      proposals: Array<{ id: string; reviewStatus?: string }>;
    };
    expect(rejectedJson.proposals.find((t) => t.id === id)?.reviewStatus).toBe("rejected");
  } finally {
    await cleanupProbe(request, id);
  }
});

function probeAsin(seed: string): string {
  const body = seed.replace(/[^A-Z0-9]/gi, "").toUpperCase().padEnd(8, "0").slice(0, 8);
  return `B0${body}`;
}

test("ingest key can reject and edit pending proposals but cannot publish", async ({
  playwright,
  request,
}) => {
  const ingestKey = process.env.ADMIN_INGEST_KEY?.trim();
  test.skip(
    !ingestKey,
    "Set ADMIN_INGEST_KEY on the dev server and this process (same value as ingest).",
  );

  const stamp = Date.now().toString(36);
  const id = `kk-queue-bearer-${stamp}`;
  const batchId = `kk-queue-bearer-batch-${stamp}`;
  const stagedId = `kk-queue-bearer-staged-${stamp}`;
  const bearer = await playwright.request.newContext({
    baseURL: "http://localhost:3456",
    extraHTTPHeaders: { Authorization: `Bearer ${ingestKey}` },
  });
  const wrong = await playwright.request.newContext({
    baseURL: "http://localhost:3456",
    extraHTTPHeaders: { Authorization: "Bearer not-the-ingest-key" },
  });
  const pin = await playwright.request.newContext({ baseURL: "http://localhost:3456" });

  try {
    const denied = await wrong.post(`/api/admin/toy-proposals/${id}/reject`);
    expect(denied.status()).toBe(401);

    const ingest = await bearer.post("/api/admin/toy-proposals", {
      data: {
        source: "playwright",
        id,
        name: "Bearer Probe",
        blurb: "Before the craft fix.",
        images: ["/categories/games.svg"],
        category: "games",
        asin: probeAsin(`R${stamp}`),
      },
    });
    expect(ingest.status(), await ingest.text()).toBe(201);

    const patched = await bearer.patch(`/api/admin/toy-proposals/${id}`, {
      data: {
        name: "Queue Craft",
        blurb: "Fixed card copy.",
        images: ["/categories/blocks.svg"],
      },
    });
    expect(patched.ok(), await patched.text()).toBeTruthy();
    const patchedJson = (await patched.json()) as {
      proposal: { name: string; blurb: string; images?: string[]; reviewStatus?: string };
    };
    expect(patchedJson.proposal.name).toBe("Queue Craft");
    expect(patchedJson.proposal.blurb).toBe("Fixed card copy.");
    expect(patchedJson.proposal.images).toContain("/categories/blocks.svg");
    expect(patchedJson.proposal.reviewStatus).toBe("pending");

    const put = await bearer.put(`/api/admin/toy-proposals/${id}`, {
      data: { blurb: "Put copy." },
    });
    expect(put.ok(), await put.text()).toBeTruthy();

    const extra = await bearer.patch(`/api/admin/toy-proposals/${id}`, {
      data: { name: "Should Not Stick", reviewStatus: "published", affiliateUrl: "https://example.com" },
    });
    expect(extra.status()).toBe(400);

    const approve = await bearer.post(`/api/admin/toy-proposals/${id}/approve`);
    expect(approve.status()).toBe(401);
    const submit = await bearer.post("/api/admin/toy-proposals/submit", {
      data: { ids: [id] },
    });
    expect(submit.status()).toBe(401);
    const deprecatedSubmit = await bearer.post("/api/admin/drafts/submit-approval", {
      data: { ids: [id] },
    });
    expect(deprecatedSubmit.status()).toBe(401);

    const catalog = await request.get(`/api/catalog?ids=${id}`);
    const catalogJson = (await catalog.json()) as { toys: Array<{ id: string }> };
    expect(catalogJson.toys.some((toy) => toy.id === id)).toBeFalsy();

    const reject = await bearer.post(`/api/admin/toy-proposals/${id}/reject`);
    expect(reject.ok(), await reject.text()).toBeTruthy();
    const rejected = await bearer.get("/api/admin/toy-proposals?status=rejected");
    const rejectedJson = (await rejected.json()) as {
      proposals: Array<{ id: string; reviewStatus?: string }>;
    };
    expect(rejectedJson.proposals.find((row) => row.id === id)?.reviewStatus).toBe("rejected");

    const editRejected = await bearer.patch(`/api/admin/toy-proposals/${id}`, {
      data: { name: "Too Late" },
    });
    expect(editRejected.status()).toBe(409);

    const batch = await bearer.post("/api/admin/toy-proposals", {
      data: {
        source: "playwright",
        id: batchId,
        name: "Batch Reject Probe",
        category: "games",
        asin: probeAsin(`B${stamp}`),
      },
    });
    expect(batch.status(), await batch.text()).toBe(201);
    const batchDenied = await wrong.post("/api/admin/drafts/reject", {
      data: { ids: [batchId] },
    });
    expect(batchDenied.status()).toBe(401);
    const batchReject = await bearer.post("/api/admin/drafts/reject", {
      data: { ids: [batchId] },
    });
    expect(batchReject.ok(), await batchReject.text()).toBeTruthy();
    const batchJson = (await batchReject.json()) as { rejected: string[] };
    expect(batchJson.rejected).toContain(batchId);

    const staged = await bearer.post("/api/admin/toy-proposals", {
      data: {
        source: "playwright",
        id: stagedId,
        name: "Staged Reject Probe",
        category: "blocks",
        asin: probeAsin(`S${stamp}`),
      },
    });
    expect(staged.status(), await staged.text()).toBe(201);
    await adminLogin(pin);
    const stage = await pin.post(`/api/admin/toy-proposals/${stagedId}/approve`);
    expect(stage.ok(), await stage.text()).toBeTruthy();
    const submitStaged = await bearer.post("/api/admin/toy-proposals/submit", {
      data: { ids: [stagedId] },
    });
    expect(submitStaged.status()).toBe(401);
    const rejectStaged = await bearer.post(`/api/admin/toy-proposals/${stagedId}/reject`);
    expect(rejectStaged.ok(), await rejectStaged.text()).toBeTruthy();
    const live = await request.get(`/api/catalog?ids=${stagedId}`);
    const liveJson = (await live.json()) as { toys: Array<{ id: string }> };
    expect(liveJson.toys.some((toy) => toy.id === stagedId)).toBeFalsy();
  } finally {
    await adminLogin(pin);
    await cleanupProbe(pin, id);
    await cleanupProbe(pin, batchId);
    await cleanupProbe(pin, stagedId);
    await bearer.dispose();
    await wrong.dispose();
    await pin.dispose();
  }
});
