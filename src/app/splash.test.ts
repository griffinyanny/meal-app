import { describe, it, expect } from "vitest";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { APPLE_SPLASH_LINKS } from "./apple-splash";
import splashDevices from "@/assets/splash-devices.json";

// The iOS launch screen (1F/C, direction 1e "Hero").
//
// ⚠️ WHAT THIS GUARDS, AND WHY NOTHING ELSE CAN. iOS picks a launch image by
// matching a media query EXACTLY. A tag whose PNG is missing gives a white flash
// on launch; a PNG with no tag is never shown at all. Both fail in complete
// silence — no build error, no console, no network tab, because the only place
// it happens is the half-second before an installed app paints. The way we would
// find out is Griffin installing it and saying it flashed white.
//
// So the tags and the files are generated from ONE table and this holds them in
// step, in both directions. `manifest.test.ts`'s idiom: read what is really on
// disk rather than restating it.
describe("apple-touch-startup-image", () => {
  const PUBLIC = join(__dirname, "..", "..", "public");
  const SPLASH_DIR = join(PUBLIC, "splash");
  const tags = APPLE_SPLASH_LINKS;

  it("should actually be wired into the document head", () => {
    // ⚠️ Without this the whole file is checking a module nobody renders. Every
    // assertion below would stay green against a `layout.tsx` that had dropped
    // the tags entirely — the app would ship with no launch screen at all and
    // the suite would say it was fine. `config.test.ts`'s idiom: scrape the
    // source rather than trust that the import is still there.
    const layout = readFileSync(join(__dirname, "layout.tsx"), "utf8");
    expect(layout).toMatch(/APPLE_SPLASH_LINKS/);
    expect(layout, "the links are imported but never reach `metadata.icons`").toMatch(
      /icons:\s*\{[\s\S]*?other:\s*APPLE_SPLASH_LINKS/
    );
  });

  it("should emit one tag per device in the table", () => {
    // If this ever reads zero, every assertion below passes vacuously — the
    // shape of false green S55 named (a check that supplies its own subject).
    expect(splashDevices.devices.length).toBeGreaterThan(0);
    expect(tags).toHaveLength(splashDevices.devices.length);
    expect(tags.every((t) => t.rel === "apple-touch-startup-image")).toBe(true);
  });

  it("should ship a PNG for every tag", () => {
    const missing = tags
      .map((t) => t.url)
      .filter((url) => !existsSync(join(PUBLIC, url)));
    expect(
      missing,
      "Declared as a launch image but absent from public/splash — these devices " +
        "flash white on launch, silently. Run `npm run splash`: "
    ).toEqual([]);
  });

  it("should have a tag for every PNG, so nothing is generated and orphaned", () => {
    // The other direction, and it is the one that goes stale first: a device
    // added to the table and generated, then forgotten in the head, is a file
    // that looks like coverage and is not.
    const declared = new Set(tags.map((t) => t.url.replace("/splash/", "")));
    const orphans = readdirSync(SPLASH_DIR)
      .filter((f) => f.endsWith(".png"))
      .filter((f) => !declared.has(f));
    expect(orphans, "PNGs in public/splash with no link tag pointing at them: ").toEqual([]);
  });

  it("should match a device by size AND pixel ratio, never size alone", () => {
    // iPhone 11 and 11 Pro Max are both 414x896pt and differ ONLY by ratio, so
    // a query without `-webkit-device-pixel-ratio` would match both and iOS
    // would hand one of them a raster at the wrong resolution.
    for (const tag of tags) {
      expect(tag.media).toMatch(/-webkit-device-pixel-ratio:\s*\d/);
      expect(tag.media).toMatch(/orientation:\s*portrait/);
    }
    expect(new Set(tags.map((t) => t.media)).size).toBe(tags.length);
  });

  it("should raster every device at its real pixel size", async () => {
    const sharp = (await import("sharp")).default;
    for (const d of splashDevices.devices) {
      const meta = await sharp(join(SPLASH_DIR, `splash-${d.id}.png`)).metadata();
      expect([meta.width, meta.height], `${d.id} is the wrong raster size`).toEqual([
        d.width * d.ratio,
        d.height * d.ratio,
      ]);
    }
  });
});
