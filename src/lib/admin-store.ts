import "server-only";
import { readStore, writeStore } from "@/lib/json-store";
import { hashPin, verifyPin } from "@/lib/admin-auth";

export type AdminPinRecord = {
  id: string;
  hash: string;
  label: string;
  pin?: string;
  createdAt: string;
};

type AdminData = {
  version: number;
  pins: AdminPinRecord[];
  failedAttempts: { count: number; lockedUntil: number | null };
};

const DEFAULT_ADMIN: AdminData = {
  version: 1,
  pins: [],
  failedAttempts: { count: 0, lockedUntil: null },
};

const LOCKOUT_AFTER = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

async function loadAdmin(): Promise<AdminData> {
  const data = await readStore("admin", DEFAULT_ADMIN);
  return {
    ...DEFAULT_ADMIN,
    ...data,
    pins: data.pins ?? [],
    failedAttempts: {
      ...DEFAULT_ADMIN.failedAttempts,
      ...data.failedAttempts,
    },
  };
}

async function saveAdmin(data: AdminData): Promise<void> {
  await writeStore("admin", data);
}

export async function hasAdminPins(): Promise<boolean> {
  const data = await loadAdmin();
  return data.pins.length > 0;
}

export async function isLockedOut(): Promise<boolean> {
  const data = await loadAdmin();
  if (!data.failedAttempts.lockedUntil) return false;
  if (Date.now() >= data.failedAttempts.lockedUntil) {
    data.failedAttempts = { count: 0, lockedUntil: null };
    await saveAdmin(data);
    return false;
  }
  return true;
}

export async function recordFailedAttempt(): Promise<void> {
  const data = await loadAdmin();
  data.failedAttempts.count += 1;
  if (data.failedAttempts.count >= LOCKOUT_AFTER) {
    data.failedAttempts.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  await saveAdmin(data);
}

export async function clearFailedAttempts(): Promise<void> {
  const data = await loadAdmin();
  data.failedAttempts = { count: 0, lockedUntil: null };
  await saveAdmin(data);
}

export async function createAdminPin(pin: string, label = "Admin"): Promise<AdminPinRecord> {
  const data = await loadAdmin();
  const record: AdminPinRecord = {
    id: `pin-${Date.now()}`,
    hash: hashPin(pin),
    label,
    pin,
    createdAt: new Date().toISOString(),
  };
  data.pins.push(record);
  await saveAdmin(data);
  return record;
}

export async function verifyAdminPin(pin: string): Promise<AdminPinRecord | null> {
  const data = await loadAdmin();
  for (const record of data.pins) {
    if (verifyPin(pin, record.hash)) return record;
  }
  return null;
}

export async function listAdminPins(): Promise<AdminPinRecord[]> {
  const data = await loadAdmin();
  return data.pins.map(({ id, hash, label, pin, createdAt }) => ({
    id,
    hash,
    label,
    pin,
    createdAt,
  }));
}

export async function removeAdminPin(id: string): Promise<boolean> {
  const data = await loadAdmin();
  const next = data.pins.filter((p) => p.id !== id);
  if (next.length === data.pins.length) return false;
  data.pins = next;
  await saveAdmin(data);
  return true;
}
