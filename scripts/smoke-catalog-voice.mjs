/**
 * Smoke: catalog name/blurb normalizers match live KidsKatalog voice.
 * Run: node scripts/smoke-catalog-voice.mjs
 */
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { "@": "/workspace/src" },
});
const {
  shortCardName,
  normalizeCatalogName,
  normalizeCatalogBlurb,
} = jiti("../src/lib/toy-card-style.ts");

function wordCount(s) {
  return s
    .replace(/[.!?]+$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

const cases = [
  {
    title:
      "LED Bath Toy Boat Set for Kids Toddlers - Floating Light Up Water Toys",
    desc: "This amazing educational STEM bath toy is perfect for creative kids ages 3 and up. Buy now and save.",
  },
  {
    title: "Official Marvel Spider-Man Motorcycle Vehicle for Boys Ages 4+",
    desc: "Spidey rides into action on a cool motorcycle with lights and sounds for pretend play adventures.",
  },
  {
    title: "Magnetic Building Tiles for Kids 110 Piece Set STEM Learning",
    desc: "Build castles and towers with colorful magnetic tiles that snap together easily for creative play.",
  },
];

for (const c of cases) {
  const name = normalizeCatalogName(shortCardName(c.title), c.title);
  const blurb = normalizeCatalogBlurb(
    "This amazing educational STEM toy is perfect for creative kids ages 5 and up and makes a great gift!",
    c.title,
    c.desc,
  );
  const nameWords = wordCount(name);
  const blurbWords = wordCount(blurb);

  assert.ok(nameWords >= 1 && nameWords <= 2, `name words ${nameWords} for ${name}`);
  assert.ok(blurbWords >= 3 && blurbWords <= 6, `blurb words ${blurbWords} for ${blurb}`);
  assert.match(blurb, /[.!?]$/);
  assert.ok(!/perfect for|great gift|buy now/i.test(blurb), `marketing junk in blurb: ${blurb}`);
  console.log("OK", { name, blurb, nameWords, blurbWords });
}

assert.equal(
  wordCount(normalizeCatalogName("Magnetic Glow Pyramid Adventure Kit", "x")),
  2,
);
assert.ok(
  wordCount(
    normalizeCatalogBlurb(
      "Magnetic pyramid glows brightly and flips around during endless creative play sessions.",
      "Glow Pyramid",
    ),
  ) <= 6,
);

const empty = normalizeCatalogBlurb(
  "",
  "Ocean Rescue",
  "Bath vehicles light up underwater adventures daily.",
);
assert.match(empty, /[.!?]$/);
assert.ok(wordCount(empty) <= 6);

console.log("smoke-catalog-voice: all checks passed");
