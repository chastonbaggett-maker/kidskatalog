"use client";

import { SignUp } from "@clerk/nextjs";

export function ParentClerkSignUp({ returnTo }: { returnTo: string }) {
  return (
    <div className="shelf-panel shelf-panel--soft" data-testid="parent-clerk-signup">
      <div className="shelf-panel__surface p-4">
        <SignUp
          routing="path"
          path="/p/sign-up"
          signInUrl="/p/sign-in"
          forceRedirectUrl={returnTo}
          fallbackRedirectUrl={returnTo}
        />
      </div>
    </div>
  );
}
