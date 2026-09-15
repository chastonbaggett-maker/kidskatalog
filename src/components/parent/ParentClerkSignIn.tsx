"use client";

import { SignIn } from "@clerk/nextjs";

export function ParentClerkSignIn({ returnTo }: { returnTo: string }) {
  return (
    <div className="shelf-panel shelf-panel--soft" data-testid="parent-clerk-signin">
      <div className="shelf-panel__surface p-4">
        <SignIn
          routing="path"
          path="/p/sign-in"
          signUpUrl="/p/sign-up"
          forceRedirectUrl={returnTo}
          fallbackRedirectUrl={returnTo}
        />
      </div>
    </div>
  );
}
