import { ShelfHeader } from "@/components/ShelfHeader";
import { AssociatesDisclosure } from "@/components/parent/AssociatesDisclosure";

export type ParentCatalogCard = {
  id: string;
  name: string;
  blurb: string;
  image: string;
  imageAlt: string;
  buyHref: string;
};

export function ParentCatalogLanding({ cards }: { cards: ParentCatalogCard[] }) {
  return (
    <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden">
        <ShelfHeader
          title="Parent Mode"
          subtitle="Every toy, with a Buy link for grown-ups"
          logoHref="/"
        />
        <div className="page-scroll star-field min-h-0 flex-1 px-4 py-6 scroll-pad-bottom">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--ink)]">
              KidsKatalog
            </h1>
            <p className="max-w-md text-base text-[var(--ink-soft)]">
              The full toy catalog for grown-ups. Each card links to Amazon.
            </p>
            <a
              href="/enter-kid"
              data-testid="kid-mode-cta"
              className="inline-flex min-w-[16rem] items-center justify-center rounded-full bg-[var(--blue)] px-8 py-4 text-xl font-bold text-white shadow-md transition active:scale-[0.98]"
            >
              Kid Mode
            </a>
            <AssociatesDisclosure className="max-w-xl text-center" />
          </div>

          <ul className="mx-auto mt-8 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
            {cards.map((card) => (
              <li
                key={card.id}
                className="shelf-panel shelf-panel--soft"
                data-testid="parent-catalog-card"
              >
                <div className="shelf-panel__surface flex flex-col gap-3 p-4">
                  <a
                    href={`/p/${encodeURIComponent(card.id)}`}
                    className="relative block h-40 overflow-hidden rounded-2xl bg-white"
                  >
                    {/* Plain img so the card photo is in the server HTML. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.image}
                      alt={card.imageAlt}
                      className="h-full w-full object-contain p-2"
                    />
                  </a>
                  <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
                    {card.name}
                  </h2>
                  <p className="text-sm text-[var(--ink-soft)]">{card.blurb}</p>
                  <a
                    href={card.buyHref}
                    target="_blank"
                    rel="sponsored noopener"
                    data-testid="parent-buy-cta"
                    className="add-kart-btn add-kart-btn--pill add-kart-btn--ready add-kart-btn--visual-ready inline-flex h-[3.9rem] items-center justify-center rounded-full px-5 text-center text-base font-bold"
                  >
                    Buy on Amazon
                  </a>
                  <AssociatesDisclosure />
                </div>
              </li>
            ))}
          </ul>

          <footer
            data-testid="parent-footer"
            className="mx-auto mt-10 w-full max-w-3xl border-t border-white/40 pt-6"
          >
            <AssociatesDisclosure className="text-center" />
          </footer>
        </div>
      </div>
    </div>
  );
}
