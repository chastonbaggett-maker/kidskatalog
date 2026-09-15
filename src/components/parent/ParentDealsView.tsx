import Link from "next/link";
import { BrandDealCta } from "@/components/parent/BrandDealCta";
import { BrandDealDisclosure } from "@/components/parent/BrandDealDisclosure";
import { ShelfHeader } from "@/components/ShelfHeader";
import { ToyPhoto } from "@/components/ToyPhoto";
import { getBrandDealToys, resolveBrandDeal } from "@/lib/brand-deals";
import { parentToyPath } from "@/lib/parent-paths";
import type { Toy } from "@/types/toy";

export function ParentDealsView({ toys }: { toys: Toy[] }) {
  const deals = getBrandDealToys(toys)
    .map((toy) => {
      const deal = resolveBrandDeal(toy);
      return deal ? { toy, deal } : null;
    })
    .filter((row): row is { toy: Toy; deal: NonNullable<ReturnType<typeof resolveBrandDeal>> } =>
      Boolean(row),
    );

  return (
    <div className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShelfHeader
        title="Brand deals"
        subtitle="Parent-only partner links — not Amazon"
        backHref="/p"
        logoHref="/p"
        trailing={<span className="w-11" aria-hidden />}
      />

      <div className="page-scroll star-field min-h-0 flex-1 space-y-4 px-4 py-4 scroll-pad-bottom">
        {deals.length === 0 ? (
          <div className="shelf-panel">
            <div className="shelf-panel__surface px-6 py-14 text-center">
              <p className="mb-2 text-[var(--ink-soft)]">
                No brand partner links yet.
              </p>
              <p className="text-sm text-[var(--ink-soft)]">
                Amazon Buy stays on each toy page. Brand deals show here when a
                partner is flagged.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {deals.map(({ toy, deal }) => (
              <li key={toy.id} className="shelf-panel shelf-panel--soft">
                <div className="shelf-panel__surface flex flex-col gap-3 p-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={parentToyPath(toy.id)}
                      prefetch={false}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
                    >
                      <ToyPhoto
                        src={toy.image}
                        alt={toy.imageAlt}
                        loading="lazy"
                        decoding="async"
                        className="kart-row__photo absolute inset-0 h-full w-full object-contain p-1.5"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={parentToyPath(toy.id)} prefetch={false}>
                        <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
                          {toy.name}
                        </p>
                      </Link>
                      <p className="truncate text-sm text-[var(--ink-soft)]">
                        {deal.partner}
                      </p>
                      <p className="text-sm text-[var(--ink-soft)]">{toy.blurb}</p>
                    </div>
                  </div>
                  <BrandDealCta deal={deal} className="w-full flex-none" />
                  <BrandDealDisclosure partner={deal.partner} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="shelf-panel shelf-panel--soft">
          <div className="shelf-panel__surface p-5">
            <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
              These cards are brand-partner CTAs only. Amazon Associates Buy
              lives on each toy&apos;s Parent Mode page — never on the same
              click, and never as Amazon Product Advertising Content on a
              partner card.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
