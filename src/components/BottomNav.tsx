"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccentStore } from "@/lib/accent-store";
import { useKartStore } from "@/lib/kart-store";

function useViewAccentClass() {
  const audience = useAccentStore((s) => s.audience);
  if (audience === "boys") return "text-[var(--boys-chip)]";
  if (audience === "girls") return "text-[var(--girls-chip)]";
  return "text-[var(--mint)]";
}

function useViewBadgeClass() {
  const audience = useAccentStore((s) => s.audience);
  if (audience === "boys") return "bg-[var(--boys-chip)]";
  if (audience === "girls") return "bg-[var(--girls-chip)]";
  return "bg-[var(--mint)]";
}

export function BottomNav() {
  const pathname = usePathname();
  const count = useKartStore((s) => s.ids.length);
  const accentClass = useViewAccentClass();
  const badgeClass = useViewBadgeClass();

  const items = [
    { href: "/shop", label: "Home", icon: HomeIcon },
    { href: "/kart", label: "Kart", icon: KartIcon, badge: count },
    { href: "/menu", label: "Menu", icon: MenuIcon },
    { href: "/", label: "Brand", icon: BrandIcon, brand: true },
  ] as const;

  return (
    <nav className="sticky bottom-0 z-40 rounded-t-[2rem] border-t border-black/5 bg-white/95 px-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_20px_-12px_rgba(80,100,180,0.35)] backdrop-blur-md">
      <ul className="flex items-end justify-around">
        {items.map((item) => {
          const active =
            item.href === "/shop"
              ? pathname.startsWith("/shop") || pathname.startsWith("/toy")
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`relative flex h-14 w-16 flex-col items-center justify-center rounded-2xl transition active:scale-95 ${accentClass} ${
                  active ? "opacity-100" : "opacity-80"
                }`}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <Icon active={active} />
                {"badge" in item && item.badge > 0 && (
                  <span
                    className={`absolute right-1.5 top-0 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-bold text-white ${badgeClass}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KartIcon() {
  return (
    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L22 8H7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}

function MenuIcon({ active }: { active?: boolean }) {
  return (
    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="4"
        ry="4"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2}
      />
    </svg>
  );
}

function BrandIcon() {
  return (
    <span
      aria-hidden
      className="block h-[38px] w-[26px] bg-current"
      style={{
        WebkitMaskImage: "url(/logo-icon.png)",
        maskImage: "url(/logo-icon.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
