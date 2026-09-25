import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { readStore, writeStore } from "@/lib/json-store";
import { parentOrigin, kidsOrigin } from "@/lib/deployment";
import {
  createParentList,
  getParentList,
  sanitizeToyIds,
  updateParentList,
} from "@/lib/parent-list-store";
import { qrSvg } from "@/lib/qr-svg";

export const DEVICE_COOKIE = "kk_device";

const TOKEN_RE = /^[a-f0-9]{32}$/;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
const TOKEN_MS = 14 * 24 * 60 * 60 * 1000;
const HANDOFF_MS = 14 * 24 * 60 * 60 * 1000;
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const MAX_DEVICES = 20;

type PairToken = {
  token: string;
  ownerId: string;
  createdAt: string;
  expiresAt: string;
};

type PairedDevice = {
  id: string;
  secretHash: string;
  ownerId: string;
  listId: string;
  pairedAt: string;
  unpairedAt: string | null;
};

type Handoff = {
  code: string;
  toyIds: string[];
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
  claimedBy: string | null;
};

type DevicePairStore = {
  version: 1;
  tokens: PairToken[];
  devices: PairedDevice[];
  handoffs: Handoff[];
};

const EMPTY: DevicePairStore = { version: 1, tokens: [], devices: [], handoffs: [] };

let writeChain: Promise<void> = Promise.resolve();

function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

function newToken(): string {
  return randomBytes(16).toString("hex");
}

function newDeviceId(): string {
  return `dev_${randomBytes(8).toString("hex")}`;
}

function newSecret(): string {
  return randomBytes(32).toString("base64url");
}

function newCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return code;
}

export function normalizeHandoffCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function pairUrl(token: string): string {
  const path = `/pair/${token}`;
  const origin = kidsOrigin();
  return origin ? `${origin}${path}` : path;
}

export function claimUrl(code: string): string {
  return `${parentOrigin()}/claim/${code}`;
}

export function deviceCookieHeader(secret: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${DEVICE_COOKIE}=${encodeURIComponent(secret)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DEVICE_COOKIE_MAX_AGE}${secure}`;
}

export function clearDeviceCookieHeader(): string {
  return `${DEVICE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readDeviceCookie(req: Request): string | undefined {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${DEVICE_COOKIE}=`)) continue;
    return decodeURIComponent(trimmed.slice(DEVICE_COOKIE.length + 1));
  }
  return undefined;
}

async function load(): Promise<DevicePairStore> {
  const data = await readStore("device-pairs", EMPTY);
  return {
    version: 1,
    tokens: Array.isArray(data.tokens) ? data.tokens : [],
    devices: Array.isArray(data.devices) ? data.devices : [],
    handoffs: Array.isArray(data.handoffs) ? data.handoffs : [],
  };
}

function publicDevice(device: PairedDevice) {
  return {
    id: device.id,
    pairedAt: device.pairedAt,
    unpairedAt: device.unpairedAt,
    listId: device.listId,
  };
}

export async function createPairToken(ownerId: string): Promise<{
  token: string;
  url: string;
  svg: string;
}> {
  const now = Date.now();
  const token = newToken();
  const row: PairToken = {
    token,
    ownerId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TOKEN_MS).toISOString(),
  };
  await serialized(async () => {
    const data = await load();
    data.tokens.push(row);
    data.tokens = data.tokens.filter((item) => Date.parse(item.expiresAt) > now).slice(-100);
    await writeStore("device-pairs", data);
  });
  const url = pairUrl(token);
  return { token, url, svg: await qrSvg(url) };
}

export async function listOwnerDevices(ownerId: string) {
  const data = await load();
  return data.devices
    .filter((device) => device.ownerId === ownerId && !device.unpairedAt)
    .map(publicDevice);
}

export async function unpairOwnerDevice(ownerId: string, deviceId: string): Promise<boolean> {
  return serialized(async () => {
    const data = await load();
    const device = data.devices.find((item) => item.id === deviceId && item.ownerId === ownerId);
    if (!device || device.unpairedAt) return false;
    device.unpairedAt = new Date().toISOString();
    await writeStore("device-pairs", data);
    return true;
  });
}

async function findActiveDevice(secret: string | undefined): Promise<PairedDevice | null> {
  if (!secret) return null;
  const digest = hashSecret(secret);
  const data = await load();
  return (
    data.devices.find(
      (device) => !device.unpairedAt && hashesEqual(device.secretHash, digest),
    ) ?? null
  );
}

export async function pairDevice(token: string): Promise<
  | { ok: true; secret: string; deviceId: string }
  | { ok: false; error: string }
> {
  if (!TOKEN_RE.test(token)) return { ok: false, error: "This link is not valid." };
  return serialized(async () => {
    const data = await load();
    const row = data.tokens.find((item) => item.token === token);
    if (!row || Date.parse(row.expiresAt) < Date.now()) {
      return { ok: false, error: "This link is not valid." };
    }
    const owned = data.devices.filter((device) => device.ownerId === row.ownerId && !device.unpairedAt);
    if (owned.length >= MAX_DEVICES) {
      return { ok: false, error: "This grown-up already has enough devices." };
    }
    const list = await createParentList(row.ownerId, {
      name: "Paired device",
      toyIds: [],
      allowEmpty: true,
    });
    const secret = newSecret();
    const device: PairedDevice = {
      id: newDeviceId(),
      secretHash: hashSecret(secret),
      ownerId: row.ownerId,
      listId: list.id,
      pairedAt: new Date().toISOString(),
      unpairedAt: null,
    };
    data.devices.push(device);
    await writeStore("device-pairs", data);
    return { ok: true, secret, deviceId: device.id };
  });
}

export async function deviceSession(secret: string | undefined): Promise<{ paired: boolean }> {
  const device = await findActiveDevice(secret);
  return { paired: Boolean(device) };
}

export async function syncDeviceKart(
  secret: string | undefined,
  toyIds: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids = sanitizeToyIds(toyIds);
  return serialized(async () => {
    const data = await load();
    if (!secret) return { ok: false, error: "This device is not paired." };
    const digest = hashSecret(secret);
    const device = data.devices.find(
      (item) => !item.unpairedAt && hashesEqual(item.secretHash, digest),
    );
    if (!device) return { ok: false, error: "This device is not paired." };
    const existing = await getParentList(device.listId, device.ownerId);
    if (!existing) {
      const created = await createParentList(device.ownerId, {
        name: "Paired device",
        toyIds: ids,
        allowEmpty: true,
      });
      device.listId = created.id;
      await writeStore("device-pairs", data);
      return { ok: true };
    }
    await updateParentList(
      device.listId,
      device.ownerId,
      { toyIds: ids },
      { allowEmpty: true },
    );
    return { ok: true };
  });
}

export async function createHandoff(toyIds: unknown): Promise<
  | { ok: true; code: string; url: string; svg: string }
  | { ok: false; error: string }
> {
  const ids = sanitizeToyIds(toyIds);
  if (ids.length === 0) return { ok: false, error: "Add a toy to the Kart first." };
  const code = await serialized(async () => {
    const data = await load();
    let next = newCode();
    for (let attempt = 0; attempt < 5 && data.handoffs.some((item) => item.code === next); attempt += 1) {
      next = newCode();
    }
    const now = Date.now();
    data.handoffs.push({
      code: next,
      toyIds: ids,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + HANDOFF_MS).toISOString(),
      claimedAt: null,
      claimedBy: null,
    });
    const fresh = data.handoffs.filter((item) => Date.parse(item.expiresAt) > now);
    data.handoffs = fresh.slice(-200);
    await writeStore("device-pairs", data);
    return next;
  });
  const url = claimUrl(code);
  return { ok: true, code, url, svg: await qrSvg(url) };
}

export async function claimHandoff(ownerId: string, rawCode: string) {
  const code = normalizeHandoffCode(rawCode);
  if (!CODE_RE.test(code)) {
    return { ok: false as const, error: "That code was not found." };
  }
  return serialized(async () => {
    const data = await load();
    const handoff = data.handoffs.find((item) => item.code === code);
    if (!handoff || Date.parse(handoff.expiresAt) < Date.now()) {
      return { ok: false as const, error: "That code was not found." };
    }
    if (handoff.claimedAt) {
      return { ok: false as const, error: "That code was already claimed." };
    }
    const list = await createParentList(ownerId, {
      name: "Kid list",
      toyIds: handoff.toyIds,
    });
    handoff.claimedAt = new Date().toISOString();
    handoff.claimedBy = ownerId;
    await writeStore("device-pairs", data);
    return { ok: true as const, list };
  });
}

export async function unpairDeviceSecret(secret: string | undefined): Promise<boolean> {
  if (!secret) return false;
  return serialized(async () => {
    const data = await load();
    const digest = hashSecret(secret);
    const device = data.devices.find(
      (item) => !item.unpairedAt && hashesEqual(item.secretHash, digest),
    );
    if (!device) return false;
    device.unpairedAt = new Date().toISOString();
    await writeStore("device-pairs", data);
    return true;
  });
}
