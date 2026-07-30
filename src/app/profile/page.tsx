import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";

export default function ProfilePage() {
  return (
    <AppShell>
      <header className="bg-[image:var(--header-grad-alt)] px-4 pb-8 pt-10 text-center text-white">
        <Logo light href="/shop" size={100} />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold">
          My profile
        </h1>
        <p className="mt-1 text-white/85">Just for browsing — no account needed.</p>
      </header>
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
