import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";

export default function OfflinePage() {
  return (
    <AppShell hideNav>
      <header className="rounded-b-[2rem] bg-[image:var(--header-grad)] px-3 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-center text-white shadow-[0_8px_20px_-12px_rgba(80,100,180,0.55)]">
        <Logo variant="icon" light glow href={null} size={44} />
      </header>
      <div className="star-field flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
          You&apos;re offline
        </h1>
        <p className="max-w-sm text-[var(--ink-soft)]">
          KidsKatalog needs a connection for some pages. Check Wi‑Fi, then try
          again.
        </p>
        <Link
          href="/shop"
          className="mt-2 rounded-full bg-[var(--blue)] px-6 py-3.5 text-base font-bold text-white shadow-md active:scale-[0.98]"
        >
          Try again
        </Link>
      </div>
    </AppShell>
  );
}
