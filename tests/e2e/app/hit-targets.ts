import type { Page } from "@playwright/test";

/**
 * Icon-only hit-target measurement, shared by `SH2` (the four tabs) and the
 * `A1` a11y sweep (the sheets and onboarding, which `SH2` cannot reach).
 *
 * Extracted rather than copied: this is the third layer to want it, and a
 * measurement duplicated across files drifts silently — one copy gets the fix
 * and the other keeps reporting a clean app. `SH2` owned the only
 * implementation until 1F/D.
 */

/** Spec §12 item 05's floor: "the glyph is 19px; the target is 44px." */
export const MIN_TARGET = 44;

export interface Target {
  where: string;
  label: string;
  tag: string;
  width: number;
  height: number;
  exempt: string | null;
}

/**
 * Every icon-only control on the current screen, measured from its real box.
 *
 * "Icon-only" is defined the way the spec defines it — a control whose whole
 * visible content is a glyph — so it is derived from the rendered tree
 * (`innerText` empty, an `<svg>` inside) rather than from a list of class names
 * someone has to remember to update.
 */
export async function iconOnlyTargets(page: Page, where: string): Promise<Target[]> {
  return page.evaluate((whereLabel) => {
    const SELECTOR = 'button, a[href], [role="button"], summary';
    return Array.from(document.querySelectorAll(SELECTOR))
      .filter((el) => {
        const node = el as HTMLElement;
        if (node.innerText.trim() !== "") return false;
        if (!node.querySelector("svg")) return false;
        const r = node.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => {
        const node = el as HTMLElement;
        const r = node.getBoundingClientRect();
        return {
          where: whereLabel,
          label:
            node.getAttribute("aria-label") ??
            node.getAttribute("data-testid") ??
            node.className.slice(0, 40),
          tag: node.tagName.toLowerCase(),
          width: Math.round(r.width * 10) / 10,
          height: Math.round(r.height * 10) / 10,
          exempt: node.getAttribute("data-hit-target-exempt"),
        };
      });
  }, where);
}

export const undersized = (targets: Target[]) =>
  targets.filter((t) => t.width < MIN_TARGET || t.height < MIN_TARGET);

export const describeTargets = (targets: Target[]) =>
  targets
    .map((t) => `  ${t.where} · <${t.tag}> "${t.label}" — ${t.width}×${t.height}`)
    .join("\n");
