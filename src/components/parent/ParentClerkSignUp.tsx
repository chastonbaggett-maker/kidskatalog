"use client";

import { SignUp } from "@clerk/nextjs";
import { parentReturnWithAuthFlag } from "@/lib/parent-paths";

export function ParentClerkSignUp({ returnTo }: { returnTo: string }) {
  const dest = parentReturnWithAuthFlag(returnTo);
  return (
    <div className="shelf-panel shelf-panel--soft" data-testid="parent-clerk-signup">
      <div className="shelf-panel__surface p-4">
        <SignUp
          routing="path"
          path="/p/sign-up"
          signInUrl="/p/sign-in"
          forceRedirectUrl={dest}
          fallbackRedirectUrl={dest}
        />
      </div>
    </div>
  );
}
