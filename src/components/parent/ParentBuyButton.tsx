"use client";

import { openSystemBrowser } from "@/lib/open-system-browser";

function isExternalBuy(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function ParentBuyButton({
  href,
  className = "",
}: {
  href: string;
  className?: string;
}) {
  const external = isExternalBuy(href);

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer sponsored" : undefined}
      onClick={(event) => {
        if (external) openSystemBrowser(href, event);
      }}
      className={`add-kart-btn add-kart-btn--pill add-kart-btn--ready add-kart-btn--visual-ready h-[3.9rem] min-w-0 flex-1 rounded-full px-5 text-center text-base font-bold shadow-md ${className}`}
    >
      <span className="add-kart-btn__label relative z-[2] inline-flex items-center justify-center">
        Buy on Amazon
      </span>
    </a>
  );
}
