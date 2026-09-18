"use client";

import { SignIn } from "@clerk/nextjs";
import { parentReturnWithAuthFlag } from "@/lib/parent-paths";

export function ParentClerkSignIn({ returnTo }: { returnTo: string }) {
  const dest = parentReturnWithAuthFlag(returnTo);
  return (
    <div className="shelf-panel shelf-panel--soft" data-testid="parent-clerk-signin">
      <div className="shelf-panel__surface p-4">
        <SignIn
          routing="path"
          path="/p/sign-in"
          signUpUrl="/p/sign-up"
          forceRedirectUrl={dest}
          fallbackRedirectUrl={dest}
        />
      </div>
    </div>
  );
}
