import Link from "next/link";
import { notFound } from "next/navigation";
import { AssociatesDisclosure } from "@/components/parent/AssociatesDisclosure";
import { ShelfHeader } from "@/components/ShelfHeader";
import { ToyPhoto } from "@/components/ToyPhoto";
import { getCatalogToy } from "@/lib/catalog-store";
import { parentToyPath } from "@/lib/parent-paths";

type Props = {
  searchParams: Promise<{ toy?: string | string[] }>;
};

export default async function BuyPlaceholderPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.toy) ? params.toy[0] : params.toy;
  const toyId = (raw || "").trim();
  if (!toyId) notFound();

  const toy = await getCatalogToy(toyId);

  return (
    <div className="shelf-page star-field flex min-h-0 flex-1 flex-col">
      <ShelfHeader
        title="Parent Mode"
        subtitle="Buy confirmation"
        backHref={toy ? parentToyPath(toy.id) : "/p"}
        logoHref="/p"
        trailing={<span className="w-11" aria-hidden />}
      />

      <div className="page-scroll star-field min-h-0 flex-1 px-4 py-4 scroll-pad-bottom">
        <div
          id="buy-placeholder"
          className="shelf-panel mx-auto w-full max-w-xl"
        >
          <div className="shelf-panel__surface flex flex-col gap-4 p-5">
            {toy ? (
              <div className="flex items-center gap-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                  <ToyPhoto
                    src={toy.image}
                    alt={toy.imageAlt}
                    className="absolute inset-0 h-full w-full object-contain p-1.5"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
                    {toy.name}
                  </p>
                  <p className="text-sm text-[var(--ink-soft)]">{toy.blurb}</p>
                </div>
              </div>
            ) : (
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
                Parent Buy
              </p>
            )}

            <p className="text-base font-bold text-[var(--ink)]">
              Associates link goes here when approved.
            </p>
            <p className="text-sm text-[var(--ink-soft)]">
              Amazon Associates is not live yet. This is the parent Buy path —
              no tagged Amazon URL, no purchase, no kid reward.
            </p>

            <div
              className="add-kart-btn add-kart-btn--pill add-kart-btn--ready add-kart-btn--visual-ready inline-flex h-[3.9rem] items-center justify-center rounded-full px-5 text-base font-bold opacity-70"
              aria-disabled="true"
            >
              Buy on Amazon
            </div>

            <AssociatesDisclosure placeholder />

            {toy ? (
              <Link
                href={parentToyPath(toy.id)}
                className="text-sm font-bold text-[var(--blue-deep)]"
              >
                Back to this toy
              </Link>
            ) : (
              <Link href="/p" className="text-sm font-bold text-[var(--blue-deep)]">
                Back to wish list
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
