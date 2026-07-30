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
  featured?: boolean;
};

export type Category = {
  id: CategoryId;
  label: string;
  hue: string;
  image: string;
  imageAlt: string;
};
