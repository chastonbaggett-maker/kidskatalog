import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=2000&q=80"
          alt="Classic toys piled together"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--forest-deep)]/75 via-[var(--forest)]/55 to-[var(--forest-deep)]/85" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-16 text-center text-white">
        <div className="hero-stars mb-4 flex items-center gap-2 text-white/90" aria-hidden>
          <span className="inline-block">
            <Star />
          </span>
          <span className="inline-block">
            <Star small />
          </span>
          <span className="inline-block">
            <Star />
          </span>
        </div>

        <div className="animate-rise">
          <Logo href={undefined} size="lg" light />
        </div>

        <h1 className="animate-rise mt-6 max-w-xl font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight sm:text-4xl [animation-delay:120ms]">
          Look at toys. Fill your Kart.
        </h1>
        <p className="animate-rise mt-3 max-w-md text-base text-white/85 sm:text-lg [animation-delay:220ms]">
          A safe catalog for kids — no buying here. Send favorites to mom or dad.
        </p>

        <div className="animate-rise mt-8 flex flex-col items-center gap-3 sm:flex-row [animation-delay:320ms]">
          <Link
            href="/shop"
            className="rounded-2xl bg-[var(--dino)] px-8 py-4 text-lg font-extrabold text-[var(--forest-deep)] shadow-lg transition hover:brightness-110 active:scale-[0.98]"
          >
            Start browsing
          </Link>
          <Link
            href="/kart"
            className="rounded-2xl bg-white/15 px-7 py-4 text-lg font-bold text-white ring-1 ring-white/35 backdrop-blur transition hover:bg-white/25 active:scale-[0.98]"
          >
            Open Kart
          </Link>
        </div>

        <div className="animate-float pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 sm:block" aria-hidden>
          <DinoPeek />
        </div>
      </div>
    </main>
  );
}

function Star({ small = false }: { small?: boolean }) {
  const size = small ? 14 : 20;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9L12 2.5z" />
    </svg>
  );
}

function DinoPeek() {
  return (
    <svg width="120" height="64" viewBox="0 0 120 64" fill="none">
      <path
        d="M20 64c8-28 22-40 44-40 14 0 24 6 32 14 6 6 14 8 20 4"
        stroke="#22c55e"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="88" cy="28" r="4" fill="#12362c" />
      <path
        d="M52 64c2-10 6-16 12-18"
        stroke="#16a34a"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
