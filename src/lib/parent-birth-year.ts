/**
 * Parent Mode birth-year gate.
 * Unlock is a session-only boolean flag — never store or log the year.
 */

export const PARENT_BIRTH_YEAR_MIN = 1901;
export const PARENT_BIRTH_YEAR_MAX = 2008;

export const PARENT_GATE_STORAGE_KEY = "kk_parent_gate";
export const PARENT_GATE_COOKIE = "kk_parent_gate";
export const PARENT_GATE_UNLOCKED_FLAG = "1";

const YEAR_RE = /^\d{4}$/;

/** True only for an integer calendar year in 1901–2008 inclusive. */
export function isAllowedParentBirthYear(raw: string): boolean {
  const text = raw.trim();
  if (!YEAR_RE.test(text)) return false;
  const year = Number.parseInt(text, 10);
  return year >= PARENT_BIRTH_YEAR_MIN && year <= PARENT_BIRTH_YEAR_MAX;
}

function cookieUnlocked(): boolean {
  if (typeof document === "undefined") return false;
  const prefix = `${PARENT_GATE_COOKIE}=`;
  for (const part of document.cookie.split(";")) {
    if (part.trim() === `${prefix}${PARENT_GATE_UNLOCKED_FLAG}`) return true;
  }
  return false;
}

export function readParentGateUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(PARENT_GATE_STORAGE_KEY) === PARENT_GATE_UNLOCKED_FLAG) {
      return true;
    }
  } catch {
    // Private mode / blocked storage — fall through to cookie.
  }
  return cookieUnlocked();
}

/** Persist a boolean session flag only. Never write the birth year. */
export function persistParentGateUnlock(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PARENT_GATE_STORAGE_KEY, PARENT_GATE_UNLOCKED_FLAG);
  } catch {
    // Cookie still covers this browser session.
  }
  document.cookie = `${PARENT_GATE_COOKIE}=${PARENT_GATE_UNLOCKED_FLAG}; path=/; SameSite=Lax`;
}
