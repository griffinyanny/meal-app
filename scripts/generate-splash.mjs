// Rasterise the iOS launch screen — "Hero", direction 1e, LOCKED by the S60
// design round (docs/design/surfaces/pwa/directions.dc.html → Artifact 02).
//
// Floor, wash, mark. Half a second of it.
//
// ⚠️ WHY THIS IS A SCRIPT AND NOT ONE FILE. Unlike the icon there is no single
// artboard: iOS matches a launch image by an EXACT media query, so every device
// size needs its own raster at its own aspect ratio. The composition is not a
// scaled square either — the wash is a FIXED-SIZE light source (560x440pt, from
// `.spec-light-hero`), so on a wider phone it covers proportionally less of the
// screen, which is what a real light does and is why the recipe states points
// rather than percentages.
//
// ⚠️ NO STATUS BAR AND NO HOME INDICATOR ARE PAINTED, and that is what "status
// bar and home indicator in" means. iOS draws both itself, over the launch
// image. Painting the frame's 9:41 into the PNG would put a second, permanently
// wrong clock underneath the real one — the design frame draws them because a
// mock has to show the screen in situ, not because they are ours to render.
//
// The device table lives in `src/assets/splash-devices.json` and is read by BOTH
// this script and `src/app/layout.tsx`. See that file for why.
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/splash");
const { devices } = JSON.parse(
  readFileSync(join(ROOT, "src/assets/splash-devices.json"), "utf8")
);

// §02's ember, frozen at the TOP of the breathe cycle: full opacity, scale
// 1.045. The orb cannot breathe in a PNG, so it is held at the peak and the
// first real breath happens when the app's own screen paints — which is the
// entire reason the wash has to agree with the screen it hands to.
const ORB_PT = 88;
const FROZEN_SCALE = 1.045;
// `.ember-core`'s box-shadow, which the 1.045 transform scales along with it.
const GLOW_BLUR_PT = 44;
const GLOW_SPREAD_PT = -8;
// §02 seats the toque at 41% of the sphere, horizontally centred (29.5% + 41% =
// 70.5%) and just below centre, so the highlight stays clear above the brim.
const TOQUE_FRACTION = 0.41;
const TOQUE_LEFT = 0.295;
const TOQUE_TOP = 0.33;
// lucide's current `ChefHat`, the same path `chef-presence.tsx` draws.
const TOQUE_PATHS = [
  "M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z",
  "M6 17h12",
];

/**
 * One radial stop of `.spec-light-hero`.
 *
 * CSS gives these as `<rx> <ry> at <x> <y>`, i.e. an ELLIPSE, which SVG reaches
 * by defining a circle of the x radius and squashing y about the centre.
 * `transparent` becomes the same hue at zero alpha — CSS interpolates gradients
 * in premultiplied space, so fading to a colourless transparent is what it
 * actually does, and fading to plain `transparent` in SVG would grey the ramp.
 */
function washStop({ id, rx, ry, cx, cy, alpha, end }) {
  const squash = ry / rx;
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse"
      cx="${cx}" cy="${cy}" r="${rx}"
      gradientTransform="translate(0 ${cy}) scale(1 ${squash}) translate(0 ${-cy})">
      <stop offset="0" stop-color="#E9B348" stop-opacity="${alpha}" />
      <stop offset="${end}" stop-color="#E9B348" stop-opacity="0" />
      <stop offset="1" stop-color="#E9B348" stop-opacity="0" />
    </radialGradient>`;
}

function splashSvg({ width, height, ratio }) {
  const W = width * ratio;
  const H = height * ratio;

  const orb = ORB_PT * FROZEN_SCALE * ratio;
  const orbR = orb / 2;
  const cx = W / 2;
  const cy = H * 0.47;

  // A CSS box-shadow blur radius is TWICE the Gaussian standard deviation, and
  // the spread shrinks the shadow's own circle. Both ride the frozen scale,
  // because a transform scales an element's shadow with it.
  const blur = GLOW_BLUR_PT * FROZEN_SCALE * ratio;
  const spread = GLOW_SPREAD_PT * FROZEN_SCALE * ratio;
  const glowR = orbR + spread;

  const toqueBox = orb * TOQUE_FRACTION;
  const toqueX = cx - orbR + orb * TOQUE_LEFT;
  const toqueY = cy - orbR + orb * TOQUE_TOP;
  const toqueScale = toqueBox / 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${washStop({ id: "hero-top", rx: 560 * ratio, ry: 440 * ratio, cx, cy: H * 0.1, alpha: 0.16, end: 0.6 })}
    ${washStop({ id: "hero-bounce", rx: 420 * ratio, ry: 300 * ratio, cx, cy: H * 1.06, alpha: 0.07, end: 0.68 })}
    <radialGradient id="ember" cx="0.4" cy="0.34" r="0.89197">
      <stop offset="0" stop-color="#FFEEC4" stop-opacity="0.97" />
      <stop offset="0.46" stop-color="#E9B348" stop-opacity="0.92" />
      <stop offset="0.78" stop-color="#8C5F19" stop-opacity="0.42" />
      <stop offset="1" stop-color="#8C5F19" stop-opacity="0.42" />
    </radialGradient>
    <filter id="glow" x="-150%" y="-150%" width="400%" height="400%">
      <feGaussianBlur stdDeviation="${blur / 2}" />
    </filter>
    <mask id="outside-orb" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="#fff" />
      <circle cx="${cx}" cy="${cy}" r="${orbR}" fill="#000" />
    </mask>
  </defs>

  <rect width="${W}" height="${H}" fill="#0F0B08" />
  <rect width="${W}" height="${H}" fill="url(#hero-top)" />
  <rect width="${W}" height="${H}" fill="url(#hero-bounce)" />

  <g mask="url(#outside-orb)">
    <circle cx="${cx}" cy="${cy}" r="${glowR}" fill="#E9B348" fill-opacity="0.6" filter="url(#glow)" />
  </g>
  <circle cx="${cx}" cy="${cy}" r="${orbR}" fill="url(#ember)" />

  <g transform="translate(${toqueX} ${toqueY}) scale(${toqueScale})"
     fill="none" stroke="#2A1C04" stroke-opacity="0.85" stroke-width="1.6"
     stroke-linecap="round" stroke-linejoin="round">
    ${TOQUE_PATHS.map((d) => `<path d="${d}" />`).join("\n    ")}
  </g>
</svg>`;
}

mkdirSync(OUT, { recursive: true });

for (const device of devices) {
  const svg = splashSvg(device);
  const name = `splash-${device.id}.png`;
  await sharp(Buffer.from(svg)).png().toFile(join(OUT, name));
  console.log(
    `  ${name}  ${device.width * device.ratio}x${device.height * device.ratio}  (${device.label})`
  );
}
