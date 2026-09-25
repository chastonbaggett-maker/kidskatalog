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
          title="For parents"
          subtitle="Amazon links for grown-ups"
          logoHref="/"
          trailing={
            <a
              href="/kid-mode"
              data-testid="kid-mode-link"
              className="text-sm font-bold text-white underline"
            >
              Kid Mode
            </a>
          }
        />
        <div
          className="page-scroll star-field min-h-0 flex-1 px-4 py-6 scroll-pad-bottom"
          data-testid="parent-catalog"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
            <AssociatesDisclosure className="max-w-xl text-center" />
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--ink)]">
              KidsKatalog
            </h1>
            <p className="max-w-md text-base text-[var(--ink-soft)]">
              A toy catalog for parents. Each card links to Amazon.
            </p>
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
            className="mx-auto mt-10 flex w-full max-w-3xl flex-col items-center gap-3 border-t border-white/40 pt-6"
          >
            <AssociatesDisclosure className="text-center" />
            <p className="flex items-center gap-4 text-sm font-bold text-[var(--blue-deep)]">
              <a href="/privacy">Privacy</a>
              <a href="/kid-mode" data-testid="kid-mode-link">
                Kid Mode
              </a>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
