import splashDevices from "@/assets/splash-devices.json";

/**
 * The iOS launch-screen link tags (1F/C, direction 1e "Hero").
 *
 * iOS has no manifest field for a launch image — it matches a
 * `<link rel="apple-touch-startup-image">` by an EXACT media query, so every
 * device size needs its own tag pointing at its own PNG.
 *
 * ⚠️ Built from the SAME table `scripts/generate-splash.mjs` rasterises, so a
 * tag and its file cannot disagree. A tag with no file gives a white flash on
 * launch; a file with no tag is never shown. Both are completely silent — the
 * only place it happens is the half-second before an installed app paints — so
 * `splash.test.ts` asserts the two stay in step in both directions.
 *
 * ⚠️ The ratio clause is load-bearing, not boilerplate: iPhone 11 and 11 Pro Max
 * are both 414x896pt and differ ONLY by pixel ratio, so a query matching on size
 * alone would match both and hand one of them the wrong raster.
 *
 * Lives here rather than in `layout.tsx` so it can be tested — importing the
 * layout pulls in `next/font/google`, which does not run outside Next.
 */
export const APPLE_SPLASH_LINKS = splashDevices.devices.map((d) => ({
  rel: "apple-touch-startup-image",
  url: `/splash/splash-${d.id}.png`,
  media:
    `(device-width: ${d.width}px) and (device-height: ${d.height}px) and ` +
    `(-webkit-device-pixel-ratio: ${d.ratio}) and (orientation: portrait)`,
}));
