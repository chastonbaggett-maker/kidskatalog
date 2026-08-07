/**
 * Import Amazon toys matching KidsKatalog card style:
 * - short catchy names
 * - ~5–8 word blurbs
 * - category / audience / age metadata
 * - edge-filled product images (trim white; CSS contain frames the card)
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogPath = path.join(root, "data", "catalog.json");
const toysDir = path.join(root, "public", "toys");
const TAG = process.env.NEXT_PUBLIC_AFFILIATE_TAG || "kidskatalog-20";

const COLORS = {
  dinos: "#4A90E2",
  plush: "#F5A9C5",
  cars: "#5BA3F0",
  blocks: "#B19CD9",
  outside: "#6CB6FF",
  games: "#9B7FD1",
  stem: "#7B6DFF",
  pretend: "#EF8FB3",
};

/** Curated card metadata keyed by ASIN — matches existing catalog voice. */
const META = {
  B00006RVTS: { id: "color-pencils", name: "Color Pencils", blurb: "Bright colors ready to draw.", category: "pretend", audience: "all", ageMin: 4, ageMax: 12 },
  B003HGGPLW: { id: "bold-markers", name: "Bold Markers", blurb: "Washable markers for big art.", category: "pretend", audience: "all", ageMin: 3, ageMax: 10 },
  B000PCWKBA: { id: "erase-pencils", name: "Erase Pencils", blurb: "Color, erase, and try again.", category: "pretend", audience: "all", ageMin: 5, ageMax: 12 },
  B00JM5GW10: { id: "play-doh-ten", name: "Doh Pack", blurb: "Ten tubs of squishy fun.", category: "pretend", audience: "all", ageMin: 2, ageMax: 7 },
  B07BC44JFC: { id: "jewel-doh", name: "Jewel Doh", blurb: "Sparkly colors for little hands.", category: "pretend", audience: "girls", ageMin: 2, ageMax: 6 },
  B0D9ZTW7PS: { id: "nice-ice", name: "Nice Ice", blurb: "Cool squish that never melts.", category: "games", audience: "all", ageMin: 3, ageMax: 12 },
  B0DG2VRFV7: { id: "squish-party", name: "Squish Party", blurb: "Soft squishies for sharing.", category: "games", audience: "all", ageMin: 3, ageMax: 10 },
  B004TQ0O3Y: { id: "kid-scissors", name: "Kid Scissors", blurb: "Pointed tips for careful cuts.", category: "pretend", audience: "all", ageMin: 5, ageMax: 10 },
  B00JM5GZGW: { id: "mega-doh", name: "Mega Doh", blurb: "A huge pack of colors.", category: "pretend", audience: "all", ageMin: 2, ageMax: 8 },
  B07PQFT83F: { id: "buzz-talk", name: "Buzz Talk", blurb: "Buzz Lightyear talks and poses.", category: "pretend", audience: "boys", ageMin: 3, ageMax: 8 },
  B098PMWSVS: { id: "habitat-stickers", name: "Habitat Stickers", blurb: "Animals stick all around.", category: "pretend", audience: "all", ageMin: 3, ageMax: 8 },
  B087N9N6HH: { id: "mini-doh", name: "Mini Doh", blurb: "Tiny tubs for every friend.", category: "pretend", audience: "all", ageMin: 2, ageMax: 7 },
  B08SGH7NKX: { id: "balance-bike", name: "Balance Bike", blurb: "Roll, glide, and zoom.", category: "outside", audience: "all", ageMin: 1, ageMax: 4 },
  B07P6MZPK3: { id: "uno-cards", name: "Uno Cards", blurb: "Classic color-match card race.", category: "games", audience: "all", ageMin: 7, ageMax: 13 },
  B07B6ZN7P8: { id: "word-friends", name: "Word Friends", blurb: "Press pages to learn words.", category: "stem", audience: "all", ageMin: 1, ageMax: 4 },
  B0B21ZM7LJ: { id: "wrist-rattles", name: "Wrist Rattles", blurb: "Jingles for tiny hands and feet.", category: "pretend", audience: "all", ageMin: 0, ageMax: 1 },
  B0CD42KQ3K: { id: "teethe-ball", name: "Teethe Ball", blurb: "Soft sensory ball for gums.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B00ZRD99C0: { id: "oball-classic", name: "Oball Classic", blurb: "Easy-grasp ball for babies.", category: "outside", audience: "all", ageMin: 0, ageMax: 2 },
  B0C6DLN75N: { id: "teethe-mitten", name: "Teethe Mitten", blurb: "Soft mitten soothes sore gums.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B08X1YQ2N9: { id: "spin-planes", name: "Spin Planes", blurb: "Suction spinners twirl and whirl.", category: "stem", audience: "all", ageMin: 1, ageMax: 4 },
  B07NXDJ52C: { id: "stack-rings", name: "Stack Rings", blurb: "Colorful rings stack and sort.", category: "blocks", audience: "all", ageMin: 0, ageMax: 2 },
  B0BYNDL3SW: { id: "chew-remote", name: "Chew Remote", blurb: "Teether shaped like a remote.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B008J1QP7Y: { id: "oball-shaker", name: "Oball Shaker", blurb: "Shake it for soft sounds.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B000YDDF6O: { id: "tune-tunes", name: "Tune Tunes", blurb: "Tiny piano plays sweet songs.", category: "stem", audience: "all", ageMin: 0, ageMax: 3 },
  B01NCUSC7V: { id: "first-blocks", name: "First Blocks", blurb: "Shape blocks drop in place.", category: "blocks", audience: "all", ageMin: 0, ageMax: 2 },
  B00NHQF6MG: { id: "lego-large", name: "Brick Box", blurb: "Huge box of classic bricks.", category: "blocks", audience: "all", ageMin: 4, ageMax: 99 },
  B0CX4RLCXW: { id: "micro-mags", name: "Micro Mags", blurb: "Tiny magnetic tiles travel well.", category: "blocks", audience: "all", ageMin: 3, ageMax: 8 },
  B0FMS7CRHX: { id: "lego-daisies", name: "Lego Daisies", blurb: "Build a bright daisy bloom.", category: "blocks", audience: "all", ageMin: 6, ageMax: 12 },
  B0DRW5YM7M: { id: "tropic-toucan", name: "Tropic Toucan", blurb: "Three builds, one wild bird.", category: "blocks", audience: "all", ageMin: 7, ageMax: 12 },
  B0CHJTD1FS: { id: "magnet-cubes", name: "Magnet Cubes", blurb: "Stacking magnets click together.", category: "blocks", audience: "all", ageMin: 3, ageMax: 8 },
  B0CGY4J7QT: { id: "flatbed-copter", name: "Flatbed Copter", blurb: "Truck flips into a chopper.", category: "cars", audience: "boys", ageMin: 6, ageMax: 12 },
  B0G2SZQS1C: { id: "rocking-plants", name: "Rocking Plants", blurb: "Botanical bricks that rock gently.", category: "blocks", audience: "all", ageMin: 6, ageMax: 12 },
  B0FMS84RFJ: { id: "time-machine", name: "Time Machine", blurb: "Speed Champions race through time.", category: "cars", audience: "boys", ageMin: 9, ageMax: 14 },
  B0DRW6C2RF: { id: "happy-plants", name: "Happy Plants", blurb: "Build cute leafy plant pals.", category: "blocks", audience: "all", ageMin: 6, ageMax: 12 },
  B07WJJF8PB: { id: "duplo-box", name: "Duplo Box", blurb: "Big bricks for little builders.", category: "blocks", audience: "all", ageMin: 1, ageMax: 5 },
  B00NHQFA1I: { id: "brick-medium", name: "Brick Medium", blurb: "Creative bricks in a handy box.", category: "blocks", audience: "all", ageMin: 4, ageMax: 99 },
  B0FMS891HB: { id: "cute-hamster", name: "Cute Hamster", blurb: "Build a fluffy hamster friend.", category: "blocks", audience: "all", ageMin: 6, ageMax: 12 },
  B0CP4BSFB9: { id: "jelly-blox", name: "Jelly Blox", blurb: "Soft blocks squish and stick.", category: "blocks", audience: "all", ageMin: 1, ageMax: 4 },
  B000068CKY: { id: "wood-blocks", name: "Wood Blocks", blurb: "Classic wooden blocks to stack.", category: "blocks", audience: "all", ageMin: 2, ageMax: 6 },
  B077Z1R28P: { id: "taco-cat", name: "Taco Cat", blurb: "Slap cards before anyone else.", category: "games", audience: "all", ageMin: 8, ageMax: 13 },
  B011POF36K: { id: "fine-markers", name: "Fine Markers", blurb: "Classic washable fine-tip colors.", category: "pretend", audience: "all", ageMin: 3, ageMax: 10 },
  B0F9WHCL19: { id: "aqua-puffs", name: "Aqua Puffs", blurb: "Mess-free puffy paint magic.", category: "pretend", audience: "all", ageMin: 4, ageMax: 10 },
  B0F8LLT3JR: { id: "party-treasure", name: "Party Treasure", blurb: "A big pack of prize toys.", category: "games", audience: "all", ageMin: 4, ageMax: 10 },
  B083FM3R87: { id: "ginger-cat", name: "Ginger Cat", blurb: "Soft mini plush kitty cuddle.", category: "plush", audience: "all", ageMin: 0, ageMax: 99 },
  B07D4RN9NH: { id: "twist-pencils", name: "Twist Pencils", blurb: "Twist up colors, no sharpening.", category: "pretend", audience: "all", ageMin: 4, ageMax: 12 },
  B0C6XBP4CW: { id: "gumdrop-doh", name: "Gumdrop Doh", blurb: "Textured squish that pops back.", category: "games", audience: "all", ageMin: 3, ageMax: 12 },
  B003U9CCP4: { id: "water-paints", name: "Water Paints", blurb: "Washable watercolors and a brush.", category: "pretend", audience: "all", ageMin: 3, ageMax: 10 },
  B0BXF8W8BM: { id: "bubble-mower", name: "Bubble Mower", blurb: "Push mower blows fun bubbles.", category: "outside", audience: "all", ageMin: 2, ageMax: 5 },
  B0CHS2VNHC: { id: "karaoke-box", name: "Karaoke Box", blurb: "Sing loud with dual mics.", category: "stem", audience: "all", ageMin: 5, ageMax: 12 },
  B0B68W6ZMT: { id: "kid-cam", name: "Kid Cam", blurb: "Snap photos with a soft cam.", category: "stem", audience: "all", ageMin: 3, ageMax: 8 },
  B0D8QG23HQ: { id: "spark-talkies", name: "Spark Talkies", blurb: "Walkie talkies for girl adventures.", category: "stem", audience: "girls", ageMin: 3, ageMax: 8 },
  B0CSJQHF6W: { id: "bitzee-magic", name: "Bitzee Magic", blurb: "Digital Disney pals in hand.", category: "stem", audience: "all", ageMin: 5, ageMax: 10 },
  B012GUL13G: { id: "paw-talkies", name: "Paw Talkies", blurb: "Chase and Marshall can chat.", category: "stem", audience: "all", ageMin: 3, ageMax: 7 },
  B093TLHGF4: { id: "tonie-start", name: "Tonie Start", blurb: "Stories play with a puppy box.", category: "stem", audience: "all", ageMin: 3, ageMax: 8 },
  B0C2Z33RLN: { id: "camo-talkies", name: "Camo Talkies", blurb: "Rechargeable radios for outdoor play.", category: "stem", audience: "boys", ageMin: 3, ageMax: 10 },
  B0B49BS7GH: { id: "robo-fish", name: "Robo Fish", blurb: "Water wakes this swimming fish.", category: "stem", audience: "all", ageMin: 3, ageMax: 8 },
  B08PF4T8W1: { id: "dance-mat", name: "Dance Mat", blurb: "Jump, dance, and light it up.", category: "outside", audience: "girls", ageMin: 3, ageMax: 8 },
  B0D541M5C6: { id: "yoto-mini", name: "Yoto Mini", blurb: "Screen-free stories on the go.", category: "stem", audience: "all", ageMin: 3, ageMax: 10 },
  B0FB74L24S: { id: "ms-rachel", name: "Ms Rachel", blurb: "Favorite teacher sings along.", category: "stem", audience: "all", ageMin: 1, ageMax: 5 },
  B0DQ6C171P: { id: "bluey-hide", name: "Bluey Hide", blurb: "Hide-and-seek Bluey figures play.", category: "pretend", audience: "all", ageMin: 3, ageMax: 7 },
  B07RWVTHQH: { id: "flash-talkies", name: "Flash Talkies", blurb: "Talk far with flashlight radios.", category: "stem", audience: "all", ageMin: 3, ageMax: 10 },
  B0BJ6M9ZYW: { id: "write-tablet", name: "Write Tablet", blurb: "Draw, erase, and draw again.", category: "stem", audience: "all", ageMin: 3, ageMax: 10 },
  B0DQ6GQMCY: { id: "real-pet", name: "Real Pet", blurb: "A pet that talks back.", category: "plush", audience: "all", ageMin: 4, ageMax: 10 },
  B0C5CW9V7P: { id: "first-camera", name: "First Camera", blurb: "Kid camera for first photos.", category: "stem", audience: "girls", ageMin: 3, ageMax: 8 },
  B0772WYFPP: { id: "oball-rattle", name: "Oball Rattle", blurb: "Soft ball with gentle rattle.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B0DHH7LGZT: { id: "contrast-book", name: "Contrast Book", blurb: "Black-and-white pages for newborns.", category: "pretend", audience: "all", ageMin: 0, ageMax: 1 },
  B0D2ZD6J2W: { id: "busy-board", name: "Busy Board", blurb: "Latches and switches to explore.", category: "stem", audience: "all", ageMin: 1, ageMax: 4 },
  B0CNVDR9SB: { id: "fruit-feeder", name: "Fruit Feeder", blurb: "Silicone feeder soothes while tasting.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B0CJ5HJB37: { id: "soft-teethers", name: "Soft Teethers", blurb: "Two silicone teethers for gums.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B0BBWJMHZ6: { id: "brush-teether", name: "Brush Teether", blurb: "Bristles massage sore baby gums.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B0DZ65RJSP: { id: "switch-board", name: "Switch Board", blurb: "Light switches click and glow.", category: "stem", audience: "all", ageMin: 1, ageMax: 4 },
  B001ABZGU2: { id: "lots-links", name: "Lots Links", blurb: "Linking rings click and stretch.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B07CZTLXG2: { id: "cool-teethers", name: "Cool Teethers", blurb: "Chilled water teethers feel nice.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B01LYHTATF: { id: "nana-brush", name: "Nana Brush", blurb: "Banana brush for first teeth.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B08SZLRC67: { id: "lovey-teether", name: "Lovey Teether", blurb: "Soft lovey with a teether.", category: "plush", audience: "all", ageMin: 0, ageMax: 2 },
  B003N9M6YI: { id: "key-teether", name: "Key Teether", blurb: "Icy key ring cools gums.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B0D6YSZ8WM: { id: "tub-toys", name: "Tub Toys", blurb: "Bath toys splash and float.", category: "outside", audience: "all", ageMin: 1, ageMax: 5 },
  B000JWSO9I: { id: "raz-berry", name: "Raz Berry", blurb: "Berry teether with soft textures.", category: "pretend", audience: "all", ageMin: 0, ageMax: 2 },
  B0FMS8VHYM: { id: "spidey-bike", name: "Spidey Bike", blurb: "Spidey rides a cool motorcycle.", category: "cars", audience: "boys", ageMin: 4, ageMax: 9 },
  "1338603450": { id: "gear-bots", name: "Gear Bots", blurb: "Build bots with spinning gears.", category: "stem", audience: "all", ageMin: 8, ageMax: 13 },
  B0BLJ4FDT4: { id: "space-shuttle", name: "Space Shuttle", blurb: "Blast off with three builds.", category: "blocks", audience: "boys", ageMin: 7, ageMax: 12 },
  B0CGYN1GJ5: { id: "monster-truck", name: "Monster Truck", blurb: "Big tires crush the course.", category: "cars", audience: "boys", ageMin: 5, ageMax: 10 },
  B0BLH6WQQ7: { id: "magnet-tiles", name: "Magnet Tiles", blurb: "110 magnetic tiles for castles.", category: "blocks", audience: "all", ageMin: 3, ageMax: 8 },
  B0CV2HGNY9: { id: "amg-racer", name: "AMG Racer", blurb: "Build a sleek Mercedes racer.", category: "cars", audience: "boys", ageMin: 9, ageMax: 14 },
  B09JKVKC47: { id: "green-base", name: "Green Base", blurb: "Big green plate for builds.", category: "blocks", audience: "all", ageMin: 4, ageMax: 99 },
  B00N7CD4BK: { id: "brain-flakes", name: "Brain Flakes", blurb: "Interlocking discs snap into shapes.", category: "blocks", audience: "all", ageMin: 3, ageMax: 10 },
  B0FMS7YJFM: { id: "hummingbird", name: "Hummingbird", blurb: "Build a bright tiny bird.", category: "blocks", audience: "all", ageMin: 7, ageMax: 12 },
  B0DMSPF13X: { id: "glow-pyramid", name: "Glow Pyramid", blurb: "Magnetic pyramid glows and flips.", category: "games", audience: "all", ageMin: 6, ageMax: 13 },
  B0DJ1BQHQX: { id: "surprise-spider", name: "Surprise Spider", blurb: "Three creepy-crawly builds inside.", category: "blocks", audience: "all", ageMin: 7, ageMax: 12 },
  B0GH7H2GZF: { id: "dumpling-squish", name: "Dumpling Squish", blurb: "Slow-rise dumpling squeezes soft.", category: "games", audience: "all", ageMin: 3, ageMax: 12 },
  B0D5CBZWRS: { id: "fidget-pack", name: "Fidget Pack", blurb: "A dozen squeezes for calm hands.", category: "games", audience: "all", ageMin: 5, ageMax: 13 },
  B0D3WSCFJJ: { id: "stress-cubes", name: "Stress Cubes", blurb: "Slow-rise cubes for busy hands.", category: "games", audience: "all", ageMin: 5, ageMax: 13 },
  B0DQCVY1JC: { id: "texture-balls", name: "Texture Balls", blurb: "Squishy balls with fun textures.", category: "games", audience: "all", ageMin: 5, ageMax: 13 },
  B0CZ9BRMKJ: { id: "rise-balls", name: "Rise Balls", blurb: "Slow-rise stress balls bounce back.", category: "games", audience: "all", ageMin: 5, ageMax: 13 },
  B07HDX46HS: { id: "globbles", name: "Globbles", blurb: "Sticky fidgets that cling anywhere.", category: "games", audience: "all", ageMin: 5, ageMax: 12 },
  B07W5QM4DP: { id: "shashibo", name: "Shashibo", blurb: "Magnetic puzzle cube transforms endlessly.", category: "games", audience: "all", ageMin: 8, ageMax: 13 },
  B0B459CY9W: { id: "bunch-balloons", name: "Bunch Balloons", blurb: "Fill hundreds of balloons fast.", category: "outside", audience: "all", ageMin: 3, ageMax: 12 },
  B0DJ5RPZY2: { id: "retro-player", name: "Retro Player", blurb: "Handheld packed with classic games.", category: "games", audience: "all", ageMin: 6, ageMax: 13 },
  B0DT6ZPT5X: { id: "sound-putty", name: "Sound Putty", blurb: "White noise and soft putty.", category: "pretend", audience: "all", ageMin: 0, ageMax: 5 },
  B0G5WBGTWK: { id: "ocean-rescue", name: "Ocean Rescue", blurb: "Bath vehicles light up underwater.", category: "outside", audience: "all", ageMin: 1, ageMax: 5 },
};

const LINKS = `
https://www.amazon.com/Crayola-Colored-Pencil-Supplies-Assorted/dp/B00006RVTS
https://www.amazon.com/Crayola-58-7812-N-A/dp/B003HGGPLW
https://www.amazon.com/Crayola-Erasable-Non-Toxic-Pre-Sharpened-Gradation/dp/B000PCWKBA
https://www.amazon.com/Play-Doh-Modeling-Compound-Non-Toxic-Exclusive/dp/B00JM5GW10
https://www.amazon.com/Play-Doh-Christmas-Stocking-Stuffers-Preschool/dp/B07BC44JFC
https://www.amazon.com/Schylling-NeeDoh-Nice-Ice-Baby/dp/B0D9ZTW7PS
https://www.amazon.com/Squishy-Squishies-Treasure-Classroom-Birthday/dp/B0DG2VRFV7
https://www.amazon.com/Scotch-Pointed-Scissors-Inches-1442P/dp/B004TQ0O3Y
https://www.amazon.com/Play-Doh-Modeling-Compound-Non-Toxic-Exclusive/dp/B00JM5GZGW
https://www.amazon.com/Disney-Lightyear-Interactive-Talking-Action/dp/B07PQFT83F
https://www.amazon.com/CUPKIN-Animal-Habitats-Around-Activity/dp/B098PMWSVS
https://www.amazon.com/Play-Doh-Non-Toxic-Modeling-Classroom-Exclusive/dp/B087N9N6HH
https://www.amazon.com/SEREED-Balance-Toddler-Wheels-Birthday/dp/B08SGH7NKX
https://www.amazon.com/Mattel-Games-Collectible-Families-Exclusive/dp/B07P6MZPK3
https://www.amazon.com/LeapFrog-Learning-Friends-Words-Green/dp/B07B6ZN7P8
https://www.amazon.com/Infinno-Rattles-Finder-Newborn-Infants/dp/B0B21ZM7LJ
https://www.amazon.com/Montessori-Sensory-Teething-Learning-Developmental/dp/B0CD42KQ3K
https://www.amazon.com/Bright-Starts-Oball-Easy-Grasp-Classic-Ball-BPA-Free-Age-Newborn/dp/B00ZRD99C0
https://www.amazon.com/Teething-Silicone-Dropping-Teethers-Sucking/dp/B0C6DLN75N
https://www.amazon.com/Suction-Spinner-Spinning-sensory-toddlers/dp/B08X1YQ2N9
https://www.amazon.com/Sassy-Stacks-Circles-Stacking-Learning/dp/B07NXDJ52C
https://www.amazon.com/Chuya-Teether-Control-Teething-Infants/dp/B0BYNDL3SW
https://www.amazon.com/Oball-81107-Kids-Shaker-Toy/dp/B008J1QP7Y
https://www.amazon.com/Baby-Einstein-Along-Tunes-Musical/dp/B000YDDF6O
https://www.amazon.com/Fisher-Price-FFC84-Babys-First-Blocks/dp/B01NCUSC7V
https://www.amazon.com/LEGO-Classic-Large-Creative-Brick/dp/B00NHQF6MG
https://www.amazon.com/MAGNA-TILES-microMAGS-26-Piece-Magnetic-Construction/dp/B0CX4RLCXW
https://www.amazon.com/LEGO-Botanicals-Daisies-Building-Toy/dp/B0FMS7CRHX
https://www.amazon.com/LEGO-6540424-TBD-Creator-31173/dp/B0DRW5YM7M
https://www.amazon.com/Magnetic-Building-Stacking-Montessori-Toys/dp/B0CHJTD1FS
https://www.amazon.com/LEGO-Creator-Helicopter-Transforms-Propeller/dp/B0CGY4J7QT
https://www.amazon.com/LEGO-6588546-TBD-Botanicals-11506/dp/B0G2SZQS1C
https://www.amazon.com/LEGO-Champions-Machine-Future-Building/dp/B0FMS84RFJ
https://www.amazon.com/LEGO-Botanicals-Happy-Plants-Building/dp/B0DRW6C2RF
https://www.amazon.com/LEGO-Classic-Storage-Educational-Toddlers/dp/B07WJJF8PB
https://www.amazon.com/LEGO-Classic-Medium-Creative-Brick/dp/B00NHQFA1I
https://www.amazon.com/LEGO-Creator-Hamster-Flower-Building/dp/B0FMS891HB
https://www.amazon.com/Goliath-Jelly-Blox-Creative-Kit/dp/B0CP4BSFB9
https://www.amazon.com/Melissa-Doug-Wooden-Building-Blocks/dp/B000068CKY
https://www.amazon.com/Taco-Cat-Goat-Cheese-Pizza/dp/B077Z1R28P
https://www.amazon.com/Crayola-58-7726-Classic-Markers-Assorted/dp/B011POF36K
https://www.amazon.com/Skillmatics-Aqua-Puffs-Mess-Free-Valentines/dp/B0F9WHCL19
https://www.amazon.com/Party-Favors-150-Pack-Treasure-Classroom/dp/B0F8LLT3JR
https://www.amazon.com/Aurora-Mini-Flopsie-Ginger-Cat/dp/B083FM3R87
https://www.amazon.com/Crayola-Twistables-Colored-Exclusive-Stocking/dp/B07D4RN9NH
https://www.amazon.com/Schylling-NeeDoh-Gumdrop-Collectible-Assorted/dp/B0C6XBP4CW
https://www.amazon.com/Cra-Z-art-Washable-Watercolors-Colors-10651/dp/B003U9CCP4
https://www.amazon.com/John-Deere-Bubble-N-Go-Mower-Entertainment/dp/B0BXF8W8BM
https://www.amazon.com/YLL-Karaoke-Machine-Microphones-Christmas/dp/B0CHS2VNHC
https://www.amazon.com/Children-Camcorder-Silicone-Christmas-Birthday/dp/B0B68W6ZMT
https://www.amazon.com/Walkie-Talkies-Toys-Girls-Christmas/dp/B0D8QG23HQ
https://www.amazon.com/Bitzee-Disney-Interactive-Characters-Digital/dp/B0CSJQHF6W
https://www.amazon.com/Paw-Patrol-New-Walkie-Talkies/dp/B012GUL13G
https://www.amazon.com/Toniebox-Starter-Set-Playtime-Puppy/dp/B093TLHGF4
https://www.amazon.com/Inspireyes-Talkies-Rechargeable-Birthday-Camouflage/dp/B0C2Z33RLN
https://www.amazon.com/Robo-Alive-Activated-Batteries-Exclusive/dp/B0B49BS7GH
https://www.amazon.com/SUNLIN-Dance-Mat-Adjustable-Built/dp/B08PF4T8W1
https://www.amazon.com/Yoto-Mini-2024-Make-Wake/dp/B0D541M5C6
https://www.amazon.com/Tonies-Ms-Rachel-Audio-Figurine/dp/B0FB74L24S
https://www.amazon.com/Electronic-Articulated-Figurines-Interactive-Figurine/dp/B0DQ6C171P
https://www.amazon.com/SANJOIN-Talkies-Channels-Flashlight-Adventures/dp/B07RWVTHQH
https://www.amazon.com/Genialba-8-5-Inch-Colorful-Educational-Electronic/dp/B0BJ6M9ZYW
https://www.amazon.com/Little-Live-Pets-Really-Real/dp/B0DQ6GQMCY
https://www.amazon.com/Makolle-Kids-Camera-Toys-Girls/dp/B0C5CW9V7P
https://www.amazon.com/Bright-Starts-Oball-Rattle-Newborn/dp/B0772WYFPP
https://www.amazon.com/Black-White-Baby-Books-Newborn/dp/B0DHH7LGZT
https://www.amazon.com/Grarain-Montessori-Toddler-Sensory-Toddlers/dp/B0D2ZD6J2W
https://www.amazon.com/Silicone-Teethers-Breastmilk-Popsicle-Teething/dp/B0CNVDR9SB
https://www.amazon.com/Hooku-Silicone-Teething-Teethers-Teether/dp/B0CJ5HJB37
https://www.amazon.com/Silicone-Massaging-Bristles-Teething-Pacifier/dp/B0BBWJMHZ6
https://www.amazon.com/HarVow-Switches-Montessori-Toddlers-Activity/dp/B0DZ65RJSP
https://www.amazon.com/Bright-Starts-Lots-of-Links/dp/B001ABZGU2
https://www.amazon.com/Infantino-216-526-3-Pack-Water-Teethers/dp/B07CZTLXG2
https://www.amazon.com/Nuby-Nananubs-Banana-Massaging-Toothbrush/dp/B01LYHTATF
https://www.amazon.com/Itzy-Ritzy-Lovey-Including-Teether/dp/B08SZLRC67
https://www.amazon.com/Nuby-Ice-Gel-Teether-Keys/dp/B003N9M6YI
https://www.amazon.com/Toddler-Bathtub-Water-Christmas-Random/dp/B0D6YSZ8WM
https://www.amazon.com/RaZbaby-RaZ-Berry-Silicone-Teether-Multi-Texture/dp/B000JWSO9I
https://www.amazon.com/LEGO-Amazing-Friends-Motorcycle-Building/dp/B0FMS8VHYM
https://www.amazon.com/Klutz-Lego-Gear-Bots/dp/1338603450
https://www.amazon.com/LEGO-Astronaut-Spaceship-Building-Creative/dp/B0BLJ4FDT4
https://www.amazon.com/LEGO-Monster-Off-Road-Minifigure-Imaginative/dp/B0CGYN1GJ5
https://www.amazon.com/FNJO-Magnetic-110PCS-Building-Construction/dp/B0BLH6WQQ7
https://www.amazon.com/LEGO-Champions-Mercedes-AMG-Minifigures-Convertible/dp/B0CV2HGNY9
https://www.amazon.com/LEGO-6384599-Green-Baseplate/dp/B09JKVKC47
https://www.amazon.com/VIAHART-Interlocking-Educational-Alternative-Childrens/dp/B00N7CD4BK
https://www.amazon.com/LEGO-Creator-in1-Wild-Animals/dp/B0FMS7YJFM
https://www.amazon.com/TOSY-Magnet-Pyramid-Glow-Holographic/dp/B0DMSPF13X
https://www.amazon.com/LEGO-Creator-Animals-Surprising-Spider/dp/B0DJ1BQHQX
https://www.amazon.com/Midou-Dumpling-Squishy-Squishies-Stretchy/dp/B0GH7H2GZF
https://www.amazon.com/Fidget-Octopus-Squishy-Squeeze-Birthday/dp/B0D5CBZWRS
https://www.amazon.com/Rising-Squishy-Anxiety-Stretch-Classroom/dp/B0D3WSCFJJ
https://www.amazon.com/Sensory-Squishy-Textured-Density-Anxiety/dp/B0DQCVY1JC
https://www.amazon.com/VISCOO-Rising-Stress-Adults-Fidget/dp/B0CZ9BRMKJ
https://www.amazon.com/Crayola-Globbles-Squish-Fidget-Toys-6Count/dp/B07HDX46HS
https://www.amazon.com/Shashibo-DODECA-Magnetic-Puzzle-Stress/dp/B07W5QM4DP
https://www.amazon.com/Bunch-Balloons-Tropical-Rapid-Filling-Self-Sealing/dp/B0B459CY9W
https://www.amazon.com/Handheld-Preloaded-Portable-Rechargeable-Electronic/dp/B0DJ5RPZY2
https://www.amazon.com/Portable-Machine-Essentials-Babies-Kids-Putty/dp/B0DT6ZPT5X
https://www.amazon.com/Tub-RescueTM-Vehicles-Water-Activated-Easy-Grip/dp/B0G5WBGTWK
`.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);

function parseAsin(url) {
  const m = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return m?.[1]?.toUpperCase() ?? null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickImage(html) {
  const patterns = [
    /"hiRes"\s*:\s*"(https:\/\/[^"]+?media-amazon\.com\/images\/I\/[^"]+)"/,
    /"landingImageUrl"\s*:\s*"(https:\/\/[^"]+?media-amazon\.com\/images\/I\/[^"]+)"/,
    /data-old-hires="(https:\/\/[^"]+)"/,
    /https:\/\/[a-z0-9.-]*media-amazon\.com\/images\/I\/[A-Za-z0-9+,_%-]+\._AC_SL\d+_\.jpg/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    return (m[1] || m[0]).replace(/\\u002F/g, "/");
  }
  return "";
}

async function fetchImageUrl(asin) {
  const urls = [
    `https://www.amazon.com/dp/${asin}?th=1&psc=1`,
    `https://www.amazon.com/gp/product/${asin}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const imageUrl = pickImage(html);
      if (imageUrl) return imageUrl;
    } catch {
      // try next
    }
  }
  return "";
}

const TARGET_LONG = 1500;

/**
 * Match seed toys: product fills the bitmap (trim white, no 4:5 letterbox).
 * Feed/gallery CSS already applies contain + padding.
 */
async function saveCardImage(imageUrl, id) {
  if (!imageUrl) return null;
  const res = await fetch(imageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) return null;
  const input = Buffer.from(await res.arrayBuffer());
  await mkdir(toysDir, { recursive: true });
  const fileName = `${id}.jpg`;
  const outPath = path.join(toysDir, fileName);

  const flattened = await sharp(input)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  let trimmed;
  try {
    trimmed = await sharp(flattened)
      .trim({
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        threshold: 12,
      })
      .toBuffer();
  } catch {
    trimmed = flattened;
  }

  const meta = await sharp(trimmed).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const scale = TARGET_LONG / Math.max(w, h);

  await sharp(trimmed)
    .resize({
      width: Math.max(1, Math.round(w * scale)),
      height: Math.max(1, Math.round(h * scale)),
      fit: "fill",
      kernel: "lanczos3",
    })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toFile(outPath);

  return `/toys/${fileName}`;
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const existingAsins = new Set(
    catalog.toys.map((t) => parseAsin(t.affiliateUrl)).filter(Boolean),
  );
  const existingIds = new Set(catalog.toys.map((t) => t.id));

  let added = 0;
  let skipped = 0;
  let failed = 0;

  // Cap open-ended ages to match existing catalog (max 13).
  const clampAge = (n, fallback) => {
    if (n == null) return fallback;
    if (n >= 99) return 13;
    return n;
  };

  for (let i = 0; i < LINKS.length; i += 1) {
    const url = LINKS[i];
    const asin = parseAsin(url);
    if (!asin) {
      console.log(`[${i + 1}] no asin`);
      failed += 1;
      continue;
    }
    if (existingAsins.has(asin)) {
      console.log(`[${i + 1}] skip existing ${asin}`);
      skipped += 1;
      continue;
    }

    const meta = META[asin];
    if (!meta) {
      console.log(`[${i + 1}] missing META for ${asin}`);
      failed += 1;
      continue;
    }

    let id = meta.id;
    if (existingIds.has(id)) id = `${meta.id}-${asin.slice(-4).toLowerCase()}`;

    process.stdout.write(`[${i + 1}/${LINKS.length}] ${meta.name} (${asin}) ... `);

    let image = "/categories/plush.svg";
    try {
      await sleep(450);
      const imageUrl = await fetchImageUrl(asin);
      if (imageUrl) {
        const saved = await saveCardImage(imageUrl, id);
        if (saved) image = saved;
      }
    } catch (err) {
      console.log(`img-fail ${err.message}`);
    }

    const toy = {
      id,
      name: meta.name,
      category: meta.category,
      audience: meta.audience,
      blurb: meta.blurb,
      image,
      images: [image],
      imageAlt: `${meta.name} toy`,
      affiliateUrl: `https://www.amazon.com/dp/${asin}?tag=${TAG}`,
      ageMin: meta.ageMin,
      ageMax: clampAge(meta.ageMax, 12),
      color: COLORS[meta.category] ?? "#B19CD9",
    };

    catalog.toys.unshift(toy);
    existingAsins.add(asin);
    existingIds.add(id);
    added += 1;
    console.log(image.startsWith("/toys/") ? "ok" : "ok (no image)");
    await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  }

  console.log(`\nDone. added=${added} skipped=${skipped} failed=${failed} total=${catalog.toys.length}`);
  console.log(
    "META coverage",
    Object.keys(META).length,
    "links",
    LINKS.length,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
