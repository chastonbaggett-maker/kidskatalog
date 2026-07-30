export type CategoryId =
  | "dinos"
  | "plush"
  | "cars"
  | "blocks"
  | "outside"
  | "games"
  | "stem"
  | "pretend";

export type Toy = {
  id: string;
  name: string;
  category: CategoryId;
  /** Short kid-friendly blurb — keep under ~8 words */
  blurb: string;
  image: string;
  imageAlt: string;
  /** Amazon affiliate-ready product URL */
  affiliateUrl: string;
  ageMin: number;
  ageMax: number;
  color: string;
};

export type Category = {
  id: CategoryId;
  label: string;
  hue: string;
};
