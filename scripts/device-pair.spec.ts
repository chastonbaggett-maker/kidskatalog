import { test, expect } from "@playwright/test";

test("pair, live kart sync, claim, and gated unpair", async ({ playwright }) => {
  test.setTimeout(60_000);
  const parent = await playwright.request.newContext({ baseURL: "http://localhost:3456" });
  const kids = await playwright.request.newContext({ baseURL: "http://kids.localhost:3456" });
  try {
    const catalog = await kids.get("/api/catalog?limit=5");
    expect(catalog.ok()).toBeTruthy();
    const toys = ((await catalog.json()) as { toys?: Array<{ id: string }> }).toys ?? [];
    const first = toys[0]?.id;
    const second = toys[1]?.id || first;
    expect(first).toBeTruthy();

    const email = `pair-${Date.now()}@example.com`;
    const signup = await parent.post("/api/parent/auth/signup", {
      data: { email, password: "test-password-1" },
    });
    expect(signup.ok(), await signup.text()).toBeTruthy();

    const blocked = await parent.post("/api/kids/pair", { data: { token: "a".repeat(32) } });
    expect(blocked.status()).toBe(404);

    const setup = await parent.post("/api/parent/pair-token");
    expect(setup.ok(), await setup.text()).toBeTruthy();
    const setupBody = (await setup.json()) as { token?: string; url?: string; svg?: string };
    expect(setupBody.token).toMatch(/^[a-f0-9]{32}$/);
    expect(setupBody.url).toContain(`/pair/${setupBody.token}`);
    expect(setupBody.svg || "").toContain("<svg");
    expect(JSON.stringify(setupBody)).not.toMatch(/email|name|secret/i);

    const pair = await kids.post("/api/kids/pair", {
      data: { token: setupBody.token, name: "skip", email: "skip@example.com" },
    });
    expect(pair.ok(), await pair.text()).toBeTruthy();
    const pairBody = (await pair.json()) as { paired?: boolean; deviceId?: string };
    expect(pairBody.paired).toBeTruthy();
    expect(JSON.stringify(pairBody)).not.toMatch(/skip@example.com|secret/i);

    const add = await kids.post("/api/kids/kart", { data: { toyIds: [first] } });
    expect(add.ok(), await add.text()).toBeTruthy();

    const lists = await parent.get("/api/parent/lists");
    expect(lists.ok()).toBeTruthy();
    const listed = (await lists.json()) as { lists?: Array<{ name: string; toyIds: string[] }> };
    const paired = (listed.lists ?? []).find((list) => list.name === "Paired device");
    expect(paired?.toyIds).toContain(first);

    const remove = await kids.post("/api/kids/kart", { data: { toyIds: [] } });
    expect(remove.ok()).toBeTruthy();
    const afterRemove = await parent.get("/api/parent/lists");
    const removed = (await afterRemove.json()) as { lists?: Array<{ name: string; toyIds: string[] }> };
    expect(
      (removed.lists ?? []).find((list) => list.name === "Paired device")?.toyIds ?? [],
    ).not.toContain(first);

    const handoff = await kids.post("/api/kids/handoff", { data: { toyIds: [second] } });
    expect(handoff.ok(), await handoff.text()).toBeTruthy();
    const handoffBody = (await handoff.json()) as { code?: string; url?: string };
    expect(handoffBody.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(handoffBody.url).toContain(`/claim/${handoffBody.code}`);
    expect(handoffBody.url).not.toMatch(/amazon\.com/i);

    const claim = await parent.post("/api/parent/claim", { data: { code: handoffBody.code } });
    expect(claim.ok(), await claim.text()).toBeTruthy();
    const claimBody = (await claim.json()) as { list?: { name: string; toyIds: string[] } };
    expect(claimBody.list?.name).toBe("Kid list");
    expect(claimBody.list?.toyIds).toContain(second);

    const again = await parent.post("/api/parent/claim", { data: { code: handoffBody.code } });
    expect(again.status()).toBe(409);

    const denied = await kids.post("/api/kids/unpair");
    expect(denied.status()).toBe(403);
    const state = await kids.storageState();
    const device = state.cookies.find((cookie) => cookie.name === "kk_device");
    expect(device?.value).toBeTruthy();
    const unlocked = await kids.post("/api/kids/unpair", {
      headers: { cookie: `kk_device=${device?.value}; kk_parent_gate=1` },
    });
    expect(unlocked.ok()).toBeTruthy();
    const after = await kids.post("/api/kids/kart", {
      headers: { cookie: `kk_device=${device?.value}` },
      data: { toyIds: [first] },
    });
    expect(after.status()).toBe(401);
  } finally {
    await parent.dispose();
    await kids.dispose();
  }
});
