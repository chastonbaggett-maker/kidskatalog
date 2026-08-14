import type { Audience, Category, CategoryId } from "@/types/toy";

export const categories: Category[] = [
  {
    id: "dinos",
    label: "Dinos",
    hue: "#4A90E2",
    image: "/categories/dinos.svg",
    imageAlt: "Dinosaurs",
  },
  {
    id: "plush",
    label: "Plush",
    hue: "#F5A9C5",
    image: "/categories/plush.svg",
    imageAlt: "Plush toys",
  },
  {
    id: "cars",
    label: "Cars",
    hue: "#5BA3F0",
    image: "/categories/cars.svg",
    imageAlt: "Cars and trucks",
  },
  {
    id: "blocks",
    label: "Blocks",
    hue: "#B19CD9",
    image: "/categories/blocks.svg",
    imageAlt: "Building blocks",
  },
  {
    id: "outside",
    label: "Outside",
    hue: "#6CB6FF",
    image: "/categories/outside.svg",
    imageAlt: "Outside play",
  },
  {
    id: "games",
    label: "Games",
    hue: "#9B7FD1",
    image: "/categories/games.svg",
    imageAlt: "Games",
  },
  {
    id: "stem",
    label: "Build",
    hue: "#7B6DFF",
    image: "/categories/stem.svg",
    imageAlt: "Build and robots",
  },
  {
    id: "pretend",
    label: "Pretend",
    hue: "#EF8FB3",
    image: "/categories/pretend.svg",
    imageAlt: "Pretend play",
  },
];

/**
 * Top 8 general piles, ordered for each accent mode.
 * Unisex leads with broadly shared groups; boys/girls lead with
 * mode-forward favorites while still listing the full set of 8.
 */
export const TOP_CATEGORY_IDS_BY_AUDIENCE: Record<Audience, CategoryId[]> = {
  all: [
    "blocks",
    "outside",
    "games",
    "stem",
    "cars",
    "plush",
    "pretend",
    "dinos",
  ],
  boys: [
    "cars",
    "dinos",
    "outside",
    "stem",
    "blocks",
    "games",
    "plush",
    "pretend",
  ],
  girls: [
    "plush",
    "pretend",
    "blocks",
    "games",
    "outside",
    "stem",
    "cars",
    "dinos",
  ],
};

const categoryById = new Map(categories.map((c) => [c.id, c]));

export function getCategory(id: string): Category | undefined {
  return categoryById.get(id as CategoryId) ?? categories.find((c) => c.id === id);
}

/** Top 8 general categories for the active unisex / boys / girls mode. */
export function getCategoriesForAudience(audience: Audience = "all"): Category[] {
  const order = TOP_CATEGORY_IDS_BY_AUDIENCE[audience] ?? TOP_CATEGORY_IDS_BY_AUDIENCE.all;
  return order
    .map((id) => categoryById.get(id))
    .filter((c): c is Category => c != null);
}
