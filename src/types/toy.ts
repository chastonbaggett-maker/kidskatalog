export type CategoryId =
  | "dinos"
  | "plush"
  | "cars"
  | "blocks"
  | "outside"
  | "games"
  | "stem"
  | "pretend";

export type Audience = "all" | "boys" | "girls";

export type Toy = {
  id: string;
  name: string;
  category: CategoryId;
  audience: Audience;
  /** Short kid-friendly blurb — keep under ~8 words */
  blurb: string;
  image: string;
  /** Extra product photos for the detail page gallery */
  images?: string[];
  imageAlt: string;
  /** Amazon affiliate-ready product URL */
  affiliateUrl: string;
  ageMin: number;
  ageMax: number;
  color: string;
  /**
   * Legacy flag — prefer `featuredTier`.
   * When true and tier is unset, treated as Featured (tier 2).
   */
  featured?: boolean;
  /**
   * How often this card is pushed into browse/pile view.
   * 0 Normal · 1 Boost · 2 Featured · 3 Spotlight
   */
  featuredTier?: 0 | 1 | 2 | 3;
};

/** Unpublished listing awaiting admin review before going live. */
export type DraftToy = Toy & {
  asin?: string;
  createdAt?: string;
  sourceTitle?: string;
};

export type Category = {
  id: CategoryId;
  label: string;
  hue: string;
  image: string;
  imageAlt: string;
};
