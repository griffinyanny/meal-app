// Session-replay masking policy (1F/D3, S63).
//
// ⚠️ THE POSTURE IS INVERTED FROM THE VENDOR DEFAULT, DELIBERATELY.
//
// PostHog — and FullStory, LogRocket, every tool in the category — masks INPUT
// FIELDS by default, because in a typical SaaS the sensitive material is what
// users type. In this app it is mostly rendered OUTPUT: the chef's memories
// about the household, the dietary and health answers from the interview,
// household composition, children's ages, and the entire grocery list. Masking
// inputs by default covers almost none of it.
//
// So: mask everything, then unmask an explicit allow-list. A denylist fails
// open on exactly the screen we would most regret recording — the argument that
// made BUG-018's guard an allow-list.
//
// ⚠️ AND THE API THE SCOPE DOC ASSUMED DOES NOT EXIST. `scope-1F.md` describes
// "mask everything, then explicitly unmask the chrome". posthog-js has NO
// unmask capability at all — measured, not read: zero occurrences of `unmask`
// anywhere in the installed package, and no `ph-no-mask` class (only
// `ph-no-capture`, which masks HARDER). The inverted posture is reachable only
// through `maskTextFn`, the per-element escape hatch, which is what this file
// is. Same finding class as every "verify it still describes the build" lesson
// in this project, one layer down: a design written against a vendor API that
// was never checked against the vendor.

/**
 * The opt-in marker. An element carrying this attribute — and everything
 * inside it — is recorded in the clear.
 *
 * ⚠️ An ATTRIBUTE rather than a class, on purpose. Classes get copied between
 * components by people matching a visual style; `data-ph-unmask` has no visual
 * meaning, so it can only be added deliberately, and it greps cleanly for
 * review.
 */
export const UNMASK_ATTR = "data-ph-unmask";

/**
 * The only DOM surface this policy needs.
 *
 * Declared structurally so the policy is unit-testable in vitest's `node`
 * environment without pulling in jsdom for a five-line ancestor walk.
 * `HTMLElement` satisfies it.
 */
export interface MaskableElement {
  hasAttribute(name: string): boolean;
  readonly parentElement: MaskableElement | null;
}

/**
 * Is this element inside an explicitly-unmasked region?
 *
 * Walks ancestors, so marking a container unmasks its whole subtree — which is
 * what makes the allow-list small enough to review by eye.
 */
export function shouldUnmask(
  element: MaskableElement | null | undefined
): boolean {
  for (let node = element; node; node = node.parentElement) {
    if (node.hasAttribute(UNMASK_ATTR)) return true;
  }
  return false;
}

/**
 * Replace every non-whitespace character, preserving length and word shape.
 *
 * ⚠️ Length IS preserved and that is a deliberate, stated trade. It keeps the
 * replay's layout honest (a masked 40-character recipe title still wraps like
 * one, so the recording still shows what the screen looked like), at the cost
 * of leaking the LENGTH of a title or an item name. That residue is acceptable;
 * a replay whose layout is a lie is not worth recording. Same behaviour as
 * rrweb's own default mask.
 */
export function maskContent(text: string): string {
  return text.replace(/\S/g, "•");
}

/**
 * The function handed to `session_recording.maskTextFn`.
 *
 * With `maskTextSelector: "*"` every text node routes through here, so this is
 * the single decision point for what a recording can contain.
 *
 * ⚠️ `element` is optional AND nullable on purpose. rrweb's own `MaskTextFn`
 * types it `HTMLElement | null`; posthog-js's `session_recording.maskTextFn`
 * types it `HTMLElement | undefined`. The two disagree, the compiler caught it,
 * and an unknown element must mask — the absent case is the one where we know
 * least about what the text is.
 */
export function maskTextFn(
  text: string,
  element?: MaskableElement | null
): string {
  return shouldUnmask(element) ? text : maskContent(text);
}
