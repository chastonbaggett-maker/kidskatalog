/** Clerk is optional. Parent Mode works with email/password until keys exist. */

export function clerkPublishableKey(): string | null {
  const key = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").trim();
  return key.startsWith("pk_") ? key : null;
}

export function isClerkConfigured(): boolean {
  return Boolean(clerkPublishableKey());
}

export function isClerkServerConfigured(): boolean {
  const secret = (process.env.CLERK_SECRET_KEY || "").trim();
  return isClerkConfigured() && secret.startsWith("sk_");
}
