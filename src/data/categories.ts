import type { Audience, Category, CategoryId } from "@/types/toy";

export const categories: Category[] = [
  {
    id: "dinos",
    label: "Dinos",
    hue: "#4A90E2",
    image: "/toys/roar-rex.jpg",
    imageAlt: "Dinosaur toys",
    covers: {
      all: "/toys/dino-track.jpg",
      boys: "/toys/roar-rex.jpg",
      girls: "/toys/dino-pack.jpg",
    },
  },
  {
    id: "plush",
    label: "Plush",
    hue: "#F5A9C5",
    image: "/toys/bear-hug.jpg",
    imageAlt: "Plush toys",
    covers: {
      all: "/toys/bear-hug.jpg",
      boys: "/toys/duck-bath.jpg",
      girls: "/toys/bunny-soft.jpg",
    },
  },
  {
    id: "cars",
    label: "Cars",
    hue: "#5BA3F0",
    image: "/toys/race-red.jpg",
    imageAlt: "Cars and trucks",
    covers: {
      all: "/toys/mag-train.jpg",
      boys: "/toys/race-red.jpg",
      girls: "/toys/mag-train.jpg",
    },
  },
  {
    id: "blocks",
    label: "Blocks",
    hue: "#B19CD9",
    image: "/toys/mag-tiles.jpg",
    imageAlt: "Building blocks",
    covers: {
      all: "/toys/mag-tiles.jpg",
      boys: "/toys/block-mega.jpg",
      girls: "/toys/block-castle.jpg",
    },
  },
  {
    id: "outside",
    label: "Outside",
    hue: "#6CB6FF",
    image: "/toys/scooter-kid.jpg",
    imageAlt: "Outside play",
    covers: {
      all: "/toys/glow-bow.jpg",
      boys: "/toys/sky-rocket.jpg",
      girls: "/toys/bubbles-big.jpg",
    },
  },
  {
    id: "games",
    label: "Games",
    hue: "#9B7FD1",
    image: "/toys/game-puzzle.jpg",
    imageAlt: "Games",
    covers: {
      all: "/toys/game-puzzle.jpg",
      boys: "/toys/game-dice.jpg",
      girls: "/toys/game-memory.jpg",
    },
  },
  {
    id: "stem",
    label: "Build",
    hue: "#7B6DFF",
    image: "/toys/astro-light.jpg",
    imageAlt: "Build and robots",
    covers: {
      all: "/toys/astro-light.jpg",
      boys: "/toys/stem-robot.jpg",
      girls: "/toys/astro-light.jpg",
    },
  },
  {
    id: "pretend",
    label: "Pretend",
    hue: "#EF8FB3",
    image: "/toys/pretend-kitchen.jpg",
    imageAlt: "Pretend play",
    covers: {
      all: "/toys/pet-vet.jpg",
      boys: "/toys/pretend-castle.jpg",
      girls: "/toys/pretend-kitchen.jpg",
    },
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

/** Product-photo cover for a pile, tuned to the active accent when available. */
export function getCategoryCover(
  category: Category,
  audience: Audience = "all",
): string {
  return category.covers?.[audience] ?? category.covers?.all ?? category.image;
}
