"use client";

import { openSystemBrowser } from "@/lib/open-system-browser";
import type { ResolvedBrandDeal } from "@/lib/brand-deals";
import { trackParentFunnel } from "@/lib/parent-funnel-client";
import type { ParentBrandDealSource } from "@/lib/parent-funnel";

export function BrandDealCta({
  deal,
  toyId,
  source,
  className = "",
}: {
  deal: ResolvedBrandDeal;
  toyId: string;
  source: ParentBrandDealSource;
  className?: string;
}) {
  const label = deal.comingSoon
    ? "Brand partner link — coming soon"
    : "Brand partner link";

  function pingClick() {
    trackParentFunnel({
      name: "parent_brand_deal_click",
      toyId,
      source,
    });
  }

  if (deal.href && !deal.comingSoon) {
    return (
      <a
        href={deal.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => {
          pingClick();
          openSystemBrowser(deal.href!, event);
        }}
        className={`add-kart-btn add-kart-btn--pill add-kart-btn--ready add-kart-btn--visual-ready h-[3.9rem] min-w-0 flex-1 rounded-full px-5 text-center text-base font-bold shadow-md ${className}`}
      >
        <span className="add-kart-btn__label relative z-[2] inline-flex items-center justify-center">
          {label}
        </span>
      </a>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled="true"
      onClick={pingClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          pingClick();
        }
      }}
      className={`add-kart-btn add-kart-btn--pill add-kart-btn--ready add-kart-btn--visual-ready inline-flex h-[3.9rem] min-w-0 flex-1 items-center justify-center rounded-full px-5 text-center text-base font-bold opacity-70 ${className}`}
    >
      <span className="add-kart-btn__label relative z-[2] inline-flex items-center justify-center">
        {label}
      </span>
    </div>
  );
}
