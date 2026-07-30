import { AppShell } from "@/components/AppShell";
import { ShelfHeader } from "@/components/ShelfHeader";

export default function ProfilePage() {
  return (
    <AppShell>
      <ShelfHeader
        title="My profile"
        subtitle="Just for browsing — no account needed."
        altGradient
        className="pb-8"
      />
      <div className="star-field flex-1 space-y-3 px-4 py-6">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
            How it works
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Tap + to save toys. Open Kart. Send the list to a grown-up.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
