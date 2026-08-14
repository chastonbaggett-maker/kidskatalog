import type { Audience, Category, CategoryId } from "@/types/toy";

type Collage = readonly [string, string, string, string];

export const categories: Category[] = [
  {
    id: "dinos",
    label: "Dinos",
    hue: "#4A90E2",
    image: "/toys/roar-rex.jpg",
    imageAlt: "Dinosaur toys",
    collage: [
      "/toys/roar-rex.jpg",
      "/toys/dino-track.jpg",
      "/toys/dino-long.jpg",
      "/toys/dino-pack.jpg",
    ],
    collages: {
      all: [
        "/toys/dino-track.jpg",
        "/toys/roar-rex.jpg",
        "/toys/dino-pack.jpg",
        "/toys/dino-long.jpg",
      ],
      boys: [
        "/toys/roar-rex.jpg",
        "/toys/dino-long.jpg",
        "/toys/dino-track.jpg",
        "/toys/dino-pack.jpg",
      ],
      girls: [
        "/toys/dino-pack.jpg",
        "/toys/dino-track.jpg",
        "/toys/dino-long.jpg",
        "/toys/roar-rex.jpg",
      ],
    },
  },
  {
    id: "plush",
    label: "Plush",
    hue: "#F5A9C5",
    image: "/toys/bear-hug.jpg",
    imageAlt: "Plush toys",
    collage: [
      "/toys/bear-hug.jpg",
      "/toys/ginger-cat.jpg",
      "/toys/bunny-soft.jpg",
      "/toys/duck-bath.jpg",
    ],
    collages: {
      all: [
        "/toys/bear-hug.jpg",
        "/toys/ginger-cat.jpg",
        "/toys/bunny-soft.jpg",
        "/toys/lovey-teether.jpg",
      ],
      boys: [
        "/toys/duck-bath.jpg",
        "/toys/ginger-cat.jpg",
        "/toys/real-pet.jpg",
        "/toys/bear-hug.jpg",
      ],
      girls: [
        "/toys/bunny-soft.jpg",
        "/toys/bear-hug.jpg",
        "/toys/lovey-teether.jpg",
        "/toys/ginger-cat.jpg",
      ],
    },
  },
  {
    id: "cars",
    label: "Cars",
    hue: "#5BA3F0",
    image: "/toys/race-red.jpg",
    imageAlt: "Cars and trucks",
    collage: [
      "/toys/race-red.jpg",
      "/toys/mag-train.jpg",
      "/toys/big-hauler.jpg",
      "/toys/truck-dump.jpg",
    ],
    collages: {
      all: [
        "/toys/mag-train.jpg",
        "/toys/race-red.jpg",
        "/toys/train-set.jpg",
        "/toys/big-hauler.jpg",
      ],
      boys: [
        "/toys/race-red.jpg",
        "/toys/big-hauler.jpg",
        "/toys/truck-dump.jpg",
        "/toys/train-set.jpg",
      ],
      girls: [
        "/toys/mag-train.jpg",
        "/toys/spidey-bike.jpg",
        "/toys/time-machine.jpg",
        "/toys/race-red.jpg",
      ],
    },
  },
  {
    id: "blocks",
    label: "Blocks",
    hue: "#B19CD9",
    image: "/toys/mag-tiles.jpg",
    imageAlt: "Building blocks",
    collage: [
      "/toys/mag-tiles.jpg",
      "/toys/block-wood.jpg",
      "/toys/block-mega.jpg",
      "/toys/block-castle.jpg",
    ],
    collages: {
      all: [
        "/toys/mag-tiles.jpg",
        "/toys/block-wood.jpg",
        "/toys/brain-flakes.jpg",
        "/toys/magnet-cubes.jpg",
      ],
      boys: [
        "/toys/block-mega.jpg",
        "/toys/mag-tiles.jpg",
        "/toys/brain-flakes.jpg",
        "/toys/block-wood.jpg",
      ],
      girls: [
        "/toys/block-castle.jpg",
        "/toys/mag-tiles.jpg",
        "/toys/magnet-cubes.jpg",
        "/toys/block-wood.jpg",
      ],
    },
  },
  {
    id: "outside",
    label: "Outside",
    hue: "#6CB6FF",
    image: "/toys/scooter-kid.jpg",
    imageAlt: "Outside play",
    collage: [
      "/toys/scooter-kid.jpg",
      "/toys/sky-rocket.jpg",
      "/toys/bubbles-big.jpg",
      "/toys/glow-bow.jpg",
    ],
    collages: {
      all: [
        "/toys/glow-bow.jpg",
        "/toys/scooter-kid.jpg",
        "/toys/bubbles-big.jpg",
        "/toys/tub-toys.jpg",
      ],
      boys: [
        "/toys/sky-rocket.jpg",
        "/toys/scooter-kid.jpg",
        "/toys/ball-kick.jpg",
        "/toys/bubbles-big.jpg",
      ],
      girls: [
        "/toys/bubbles-big.jpg",
        "/toys/glow-bow.jpg",
        "/toys/tub-toys.jpg",
        "/toys/scooter-kid.jpg",
      ],
    },
  },
  {
    id: "games",
    label: "Games",
    hue: "#9B7FD1",
    image: "/toys/game-puzzle.jpg",
    imageAlt: "Games",
    collage: [
      "/toys/game-puzzle.jpg",
      "/toys/game-memory.jpg",
      "/toys/game-dice.jpg",
      "/toys/squish-party.jpg",
    ],
    collages: {
      all: [
        "/toys/game-puzzle.jpg",
        "/toys/squish-party.jpg",
        "/toys/globbles.jpg",
        "/toys/taco-cat.jpg",
      ],
      boys: [
        "/toys/game-dice.jpg",
        "/toys/rise-balls.jpg",
        "/toys/globbles.jpg",
        "/toys/party-treasure.jpg",
      ],
      girls: [
        "/toys/game-memory.jpg",
        "/toys/squish-party.jpg",
        "/toys/taco-cat.jpg",
        "/toys/game-puzzle.jpg",
      ],
    },
  },
  {
    id: "stem",
    label: "Build",
    hue: "#7B6DFF",
    image: "/toys/astro-light.jpg",
    imageAlt: "Build and robots",
    collage: [
      "/toys/astro-light.jpg",
      "/toys/stem-robot.jpg",
      "/toys/stem-magnets.jpg",
      "/toys/stem-kit.jpg",
    ],
    collages: {
      all: [
        "/toys/astro-light.jpg",
        "/toys/busy-board.jpg",
        "/toys/spark-talkies.jpg",
        "/toys/stem-magnets.jpg",
      ],
      boys: [
        "/toys/stem-robot.jpg",
        "/toys/stem-kit.jpg",
        "/toys/stem-magnets.jpg",
        "/toys/astro-light.jpg",
      ],
      girls: [
        "/toys/astro-light.jpg",
        "/toys/busy-board.jpg",
        "/toys/spark-talkies.jpg",
        "/toys/stem-magnets.jpg",
      ],
    },
  },
  {
    id: "pretend",
    label: "Pretend",
    hue: "#EF8FB3",
    image: "/toys/pretend-kitchen.jpg",
    imageAlt: "Pretend play",
    collage: [
      "/toys/pretend-kitchen.jpg",
      "/toys/pet-vet.jpg",
      "/toys/pretend-doctor.jpg",
      "/toys/pretend-castle.jpg",
    ],
    collages: {
      all: [
        "/toys/pet-vet.jpg",
        "/toys/pretend-kitchen.jpg",
        "/toys/pretend-castle.jpg",
        "/toys/jewel-doh.jpg",
      ],
      boys: [
        "/toys/pretend-castle.jpg",
        "/toys/pretend-doctor.jpg",
        "/toys/twist-pencils.jpg",
        "/toys/pet-vet.jpg",
      ],
      girls: [
        "/toys/pretend-kitchen.jpg",
        "/toys/pet-vet.jpg",
        "/toys/jewel-doh.jpg",
        "/toys/pretend-doctor.jpg",
      ],
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

function asCollage(images: readonly string[]): Collage {
  if (images.length >= 4) {
    return [images[0]!, images[1]!, images[2]!, images[3]!];
  }
  const filled: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    filled.push(images[i % Math.max(images.length, 1)] ?? "/toys/mag-tiles.jpg");
  }
  return [filled[0]!, filled[1]!, filled[2]!, filled[3]!];
}

/** Four-photo collage for a pile, tuned to the active accent when available. */
export function getCategoryCollage(
  category: Category,
  audience: Audience = "all",
): Collage {
  const modeSet = category.collages?.[audience] ?? category.collages?.all;
  if (modeSet?.length) return asCollage(modeSet);
  if (category.collage?.length) return asCollage(category.collage);
  const single = getCategoryCover(category, audience);
  return [single, single, single, single];
}
