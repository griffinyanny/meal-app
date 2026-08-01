// Rasterise the one 1024x1024 mark into every size iOS and Android ask for.
//
// The design pass produces ONE artboard, not a folder — hand-maintaining ten
// PNGs is how a set drifts (one gets updated, nine do not, and the wrong one is
// the 180 your phone actually renders). `src/assets/app-icon.svg` is the single
// source; run `npm run icons` after replacing it.
//
// Sharp is already a dependency (Next uses it for image optimisation), so this
// costs nothing new.
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src/assets/app-icon.svg");
const OUT = join(ROOT, "public/icons");

const svg = readFileSync(SRC);

const TARGETS = [
  // iOS reads THIS for the home screen, not the manifest's icons array. 180 is
  // the @3x iPhone size; iOS downsamples it for every other slot itself.
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

mkdirSync(OUT, { recursive: true });

for (const { name, size } of TARGETS) {
  await sharp(svg, { density: 400 }).resize(size, size).png().toFile(join(OUT, name));
  console.log(`  ${name}  ${size}x${size}`);
}

// Maskable: Android crops to the device's own shape (circle, squircle, teardrop),
// and the spec's safe zone is the middle 80%. So the mark is inset by 10% on
// each side over the flat floor colour — otherwise a circular mask shaves the
// ember. iOS ignores `purpose: maskable` entirely.
const INSET = Math.round(512 * 0.8);
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#0F0B08" },
})
  .composite([
    {
      input: await sharp(svg, { density: 400 }).resize(INSET, INSET).png().toBuffer(),
      top: Math.round((512 - INSET) / 2),
      left: Math.round((512 - INSET) / 2),
    },
  ])
  .png()
  .toFile(join(OUT, "icon-maskable-512.png"));
console.log(`  icon-maskable-512.png  512x512 (80% safe zone)`);
