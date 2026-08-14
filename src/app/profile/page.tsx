import { AppShell } from "@/components/AppShell";
import { ShelfHeader } from "@/components/ShelfHeader";

export default function ProfilePage() {
  return (
    <AppShell>
      <div className="shelf-page star-field flex min-h-0 flex-1 flex-col">
        <ShelfHeader
          title="My profile"
          subtitle="Just for browsing — no account needed."
          altGradient
          className="pb-8"
        />
        <div className="page-scroll star-field space-y-3 px-4 py-6">
          <div className="shelf-panel shelf-panel--soft">
            <div className="shelf-panel__surface p-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
                How it works
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Tap + to save toys. Open Kart. Send the list to a grown-up.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
