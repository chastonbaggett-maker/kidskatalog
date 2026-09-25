/**
 * Legacy device cookie. The parent site ignores it.
 * Kid Mode is a separate deployment. Unpair still uses the birth-year
 * session flag and never stores the year.
 */

export const SITE_MODE_COOKIE = "kk_mode";
export const SITE_MODE_KID = "kid";
export const SITE_MODE_PARENT = "parent";
export const SITE_MODE_MAX_AGE = 60 * 60 * 24 * 365;

export type SiteMode = "kid" | "parent";

export function parseSiteMode(value: string | undefined | null): SiteMode {
  return value === SITE_MODE_KID ? "kid" : "parent";
}

export function persistParentMode(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SITE_MODE_COOKIE}=${SITE_MODE_PARENT}; path=/; max-age=${SITE_MODE_MAX_AGE}; SameSite=Lax`;
}

export function persistKidMode(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SITE_MODE_COOKIE}=${SITE_MODE_KID}; path=/; max-age=${SITE_MODE_MAX_AGE}; SameSite=Lax`;
}
