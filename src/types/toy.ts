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

/**
 * Parent-only brand-network overlay. Empty / `live: false` is the default.
 * Never mixed with Amazon Buy on the same click. Never shown in Kid Mode.
 */
export type BrandAffiliate = {
  partner?: string;
  network?: string;
  url?: string;
  live?: boolean;
};

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
  /**
   * Optional product video clips shown in the detail gallery selector
   * and collected on the Watch (/menu) feed.
   */
  videos?: string[];
  imageAlt: string;
  /** Amazon affiliate-ready product URL — parent/admin only; stripped from kid surfaces */
  affiliateUrl?: string;
  /**
   * Parent-only brand-deal flag (video permission + featured video card + parent CTA).
   * Default empty — existing toys stay Amazon-catalog-only.
   * Never shown on kid surfaces. Never mixed with Amazon on the same click.
   */
  brandDeal?: boolean;
  /** External partner URL. Empty = “coming soon” placeholder. Not an Amazon PAC link. */
  brandDealUrl?: string;
  /** Partner name for the parent disclosure. */
  brandPartner?: string;
  /**
   * Optional brand-network CTA overlay (`{ partner, network, url, live }`).
   * Default empty and not live. Separate from Amazon Associates Buy.
   */
  brandAffiliate?: BrandAffiliate;
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

/**
 * Queue state. Approve stages; Reject drops (audit kept);
 * Submit Approval publishes staged cards only.
 * Legacy `proposed`/`approved` normalize to `pending`/`staged`.
 */
export type DraftReviewStatus = "pending" | "staged" | "published" | "rejected";

/** Unpublished listing awaiting admin review before going live. */
export type DraftToy = Toy & {
  asin?: string;
  createdAt?: string;
  sourceTitle?: string;
  /** Chief/bot notes from Amazon search ingest. Never shown in Kid Mode. */
  sourceNotes?: string;
  notes?: string;
  /** Ingest source label (Chief, bot name, search). Never shown in Kid Mode. */
  source?: string;
  /** External ref for the ingest batch/item. Never shown in Kid Mode. */
  sourceRef?: string;
  /**
   * `pending` sits in the queue.
   * `staged` is Approve-only — live publish is Submit Approval.
   * `published` / `rejected` are audit rows.
   */
  reviewStatus?: DraftReviewStatus;
  reviewedAt?: string;
  publishedAt?: string;
  rejectedAt?: string;
};

export type Category = {
  id: CategoryId;
  label: string;
  hue: string;
  /** Default cover image (product photo). */
  image: string;
  imageAlt: string;
  /** Optional mode-specific single covers for boys / girls accents. */
  covers?: Partial<Record<Audience, string>>;
  /** Default 4-up collage photos for menu / thumb tiles. */
  collage?: readonly string[];
  /** Optional mode-specific 4-up collages. */
  collages?: Partial<Record<Audience, readonly string[]>>;
};
