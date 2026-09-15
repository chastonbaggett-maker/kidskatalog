"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { clerkPublishableKey } from "@/lib/clerk-config";

export function ParentClerkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const key = clerkPublishableKey();
  if (!key) return children;
  return <ClerkProvider publishableKey={key}>{children}</ClerkProvider>;
}
