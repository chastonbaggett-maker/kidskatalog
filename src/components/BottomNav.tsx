"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKartStore } from "@/lib/kart-store";

export function BottomNav() {
  const pathname = usePathname();
  const count = useKartStore((s) => s.ids.length);

  const items = [
    { href: "/shop", label: "Home", icon: HomeIcon },
    { href: "/profile", label: "Profile", icon: ProfileIcon },
    { href: "/kart", label: "Kart", icon: KartIcon, badge: count },
    { href: "/menu", label: "Menu", icon: MenuIcon },
    { href: "/", label: "Brand", icon: BrandIcon, brand: true },
  ] as const;

  return (
    <nav className="sticky bottom-0 z-40 border-t border-black/5 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
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
                className={`relative flex h-12 w-14 flex-col items-center justify-center rounded-2xl transition active:scale-95 ${
                  active ? "text-[var(--blue)]" : "text-[var(--blue)]/80"
                }`}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <Icon active={active} />
                {"badge" in item && item.badge > 0 && (
                  <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--purple)] px-1 text-[10px] font-bold text-white">
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
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function KartIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function MenuIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M5 12h14M5 17h14"
        stroke="var(--purple-deep)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BrandIcon() {
  return (
    <Image
      src="/logo-color.svg"
      alt=""
      width={72}
      height={28}
      unoptimized
      className="h-7 w-auto max-w-[4.5rem] object-contain object-center"
    />
  );
}
