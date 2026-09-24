/** Session flag: after parent sign-in/up, skip the birth-year picker once. */

export const PARENT_AUTH_BYPASS_KEY = "kk_parent_auth_bypass";

export function markParentAuthBypass(): void {
  try {
    sessionStorage.setItem(PARENT_AUTH_BYPASS_KEY, "1");
  } catch {
    // Private mode / blocked storage — birth year still works as fallback.
  }
}

export function consumeParentAuthBypass(): boolean {
  try {
    const value = sessionStorage.getItem(PARENT_AUTH_BYPASS_KEY);
    if (value !== "1") return false;
    sessionStorage.removeItem(PARENT_AUTH_BYPASS_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearParentAuthBypass(): void {
  try {
    sessionStorage.removeItem(PARENT_AUTH_BYPASS_KEY);
  } catch {
    // ignore
  }
}
