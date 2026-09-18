/**
 * Parent Mode birth-year gate.
 * Unlock is in-memory only for the current Parent Mode mount — never store or log the year.
 */

export const PARENT_BIRTH_YEAR_MIN = 1901;
export const PARENT_BIRTH_YEAR_MAX = 2008;

const YEAR_RE = /^\d{4}$/;

/** True only for an integer calendar year in 1901–2008 inclusive. */
export function isAllowedParentBirthYear(raw: string): boolean {
  const text = raw.trim();
  if (!YEAR_RE.test(text)) return false;
  const year = Number.parseInt(text, 10);
  return year >= PARENT_BIRTH_YEAR_MIN && year <= PARENT_BIRTH_YEAR_MAX;
}
