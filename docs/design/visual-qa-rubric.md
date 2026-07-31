# Visual QA Rubric — the judge's constitution

How Claude critiques a captured screenshot. Grounded in **`system/design-spec.dc.html`** (Design Specification v1.0 — the visual system, canonical since S39) + `brief-plan-states.md` (per-state briefs). Purpose: catch "the code says one thing, the screen shows another" and surface polish, **before** Griffin reviews. Structured to keep the judgment consistent and anchored, not vibes.

**How to use:** for each state in a run's `manifest.json`, Read its PNG and grade the four sections below. The manifest carries `facts` (what should be true), `observed` (what the debug HUD reported — DOM ground truth), and `assertedState`. Anchor on those; do not free-associate.

## Severity ladder
- **blocker** — wrong state shown, unusable, or an anti-pattern from Guidelines §7 present. Fails the gate.
- **high** — clear layout break, meaningful content truncated/missing, or wrong content. Fails the gate.
- **medium** — spacing/hierarchy/alignment that reads as unpolished. Logged, does not gate.
- **polish** — an improvement opportunity. Never gates.

**Gate:** hand to Griffin at **0 blockers + 0 high**. Cap the auto-fix loop at **3 rounds**, then hand over with the residue listed.

## (a) Correctness — is the right stuff showing? (verify, don't discover)
The strongest hallucination defense: `assertedState` was machine-verified before the shot, so start from a trusted state label. Then verify each `facts` entry is **visibly true in the pixels**:
- Hero/sub copy strings present and legible.
- Slot count matches `facts.slotCount` / `observed.slotCount`; the titles in `observed.slotTitles` are the ones visibly rendered (flag any that are cut off or missing).
- Conditional elements present iff their flag is true (`hasThumbsRecap`, `hasStickyConfirmBar`, `hasEatingOutCard`, section labels, primary CTA…).
- Any fact asserted-true but not visibly true → **that gap is the bug.** Severity high (or blocker if the whole state is wrong).
- If `captureStatus !== "ok"` in the manifest, that state failed its pre-shot state check — treat as a blocker signal on its own.

## (b) Design-system adherence — binary checklist
PASS/FAIL each. **The colour and geometry half is judged against Design Specification v1.0's six laws**
(`system/design-spec.dc.html` §00), which is canonical since S39 and beats any earlier screen. The
anti-pattern half still cites `Guidelines.md` §7, which survives as the anti-pattern list only — **ignore
its colour values, they name the retired `#0E0E10` floor and `#3A86FF` accent.** A FAIL on a §7 hard rule
or on law 04 is a blocker.

**The six laws:**
- [ ] **Law 01 — light enters once, from above, and it is always gold.** Exactly one radial wash per screen, off-canvas at the top, under the content layer, never animated. No second light source, **no cream wash** (the spec calls this the most common drift), no second hue.
- [ ] **Law 02 — gold is who the app is; cream is what you press.** Gold only for the chef's presence: the orb, the live dot, **the active tab**, the chef's own voice. Cream for the hand: every filled button, link and interactive accent. Never both inside one control, never swapped.
- [ ] **Law 03 — nothing you read twice is accent-coloured.** Titles, body, metadata, labels: cream-white through warm grey. The only coloured type is the chef's *italic* rationale and the `YOUR CHEF` byline that introduces it.
- [ ] **Law 04 — no cool white, ever.** Every border, scrim and low-alpha fill is warm. Any `rgba(255,255,255,x)` is a **blocker**, not a nitpick — it reads blue against this floor.
- [ ] **Law 05 — a label is type, a control is a surface.** Nothing decorative wears a pill. Fill + border ⇒ it must respond to a tap. If it only names something, it is flat uppercase type with no container.
- [ ] **Law 06 — count the accents.** Per viewport: at most **three** gold marks in the content layer, exactly **one** filled cream button, at most **one** semantic hue. The active tab sits outside the count (persistent chrome is a constant). If a screen can't be legible inside the budget, the hierarchy is wrong, not the budget.
- [ ] **Geometry (§11):** every radius on the eight-rung scale (7/9/12/14/16/18/22/46) or a deliberate capsule; nested surfaces step down one rung and never match.

**The tie-breaker when two laws disagree** (Griffin's ratified line, S42): **gold marks the chef *speaking*,
not content you read.** Law 03 grants the italic rationale colour while law 06 counts marks against it —
when they collide, ask who is talking. The chef's voice keeps gold; a list of decisions you read does not.

**Still deliberately un-migrated — do NOT flag these as new findings** (spec §12 items 04/05/07, routed to
1F Workstream B, see `PROJECT-CONTEXT.md`): the Recipes double bottom bar (the nav's square top corners —
the floating-primary half already landed in 1E.5), icon-only controls under 44px, and faked subsection
headings not yet promoted to real Group/Row title levels.

⚠️ **Two former exceptions are now CLOSED (S52) and have flipped from excused to reportable.** The list
above is a licence to ignore a real defect, so a stale entry is worse than no entry — it is the same failure
S42 caught in this file's §(b), where the rubric would have passed the retired palette and failed the new
one. Both were closed by B1 + B5:
- **The iOS-green `#30D158` cooked/complete checks → `--spec-success` `#9CB86F`** (Griffin's call: the check
  keeps a hue). Any `#30D158` is now a **blocker** under law 04 — it is a cool green on a warm floor.
- **The amber `#FF9F0A` Groceries merge markers → a neutral inset carrying the count as type** (Griffin's
  call). Amber on a merge marker is now a **law 02 finding**: amber is the chef, and a merge is a mechanical
  fact about the list, so amber there says the chef is speaking when the chef is not.
- **One amber survivor is still excused, and only this one:** the quick-add dedupe notice
  (`grocery-list.tsx`, tracked as **BUG-045**). It is the same miscast one affordance over and is deliberately
  out of B5's scope, not overlooked. `src/components/palette.test.ts` allow-lists that exact line.

⚠️ **TRACKED, NOT EXEMPT — the distinction matters (S53).** The two entries below are known. **Flag them if
you find them**; they are recorded here so a judge knows they are already filed, not so a judge stays quiet
about them. An exemption is a licence to ignore a real defect and outlives the reason for it — that is the
S42/S52 failure this section keeps re-learning. A *tracked* note costs nothing if it goes stale.
- **BUG-046 🟡 — the recipe detail body wears the action hue on three non-pressable elements.** The
  ingredient bullet (`bg-primary`), the step-duration meta and the `Modified` badge all resolve to cream
  `#F4EBDC`. §01 says cream is what you press. **B1's exact finding, one surface over**, routed to B6/B8.
  Graded **medium**, so it does not block the 0 blockers / 0 high bar. `View original source` is genuinely a
  link and is correct — this is a per-element call, never a token sweep.
- **The Recipes detail captures show a POPULATED recipe body for the first time (S53).** The seeder wrote
  `ingredients: []` / `steps: []` for every recipe until now, so `recipes-detail-add-to-week` had never once
  photographed a real ingredient list or numbered steps. **Judge it as first-time surface, not as a
  re-shoot** — nothing about that body has ever been graded.

**Anti-patterns (Guidelines §7 — hard rules):**
- [ ] Glass surfaces: cards read as translucent/layered, not flat opaque boxes.
- [ ] **No emojis in app chrome** (headers, buttons, labels).
- [ ] No floating AI FAB / sparkle button.
- [ ] No persistent chat/input bar pinned to the bottom.
- [ ] Named/descriptive loading states, never a bare spinner.
- [ ] No confetti / celebration / "You did it!".
- [ ] No bright-on-bright color stacking.
- [ ] No cartoon/mascot/"No X yet!" empty-state art.
- [ ] Bold typographic hierarchy (confident headers vs muted meta).

**Approved exception (do NOT false-flag):** small, muted, all-caps **eyebrow/section labels** ("YOUR CHEF", "EARLIER THIS WEEK", "HOW'D IT GO", "TONIGHT · WEDNESDAY") are intended and correct. Only large all-caps **headers** are forbidden (§7). Grade eyebrows as PASS.

## (c) Layout / rendering — what only the pixels reveal
Defect list, severity-tagged:
- Text truncation/clipping of meaningful content (a title cut mid-word when it shouldn't be). **high**
- Overflow past a container; body scrolls sideways (the 390px frame must never scroll horizontally). **high**
- Element overlap / z-collisions (sticky bar over a card, sheet over the tab bar wrong). **high**
- Content cut off at the 390px width or below the fold when it shouldn't be. **high**
- Misalignment: cards not sharing a left edge, ragged meta rows, ugly chip wrapping. **medium**
- Touch targets visibly < ~44px, or a control that looks tappable but is undersized/overlapped (the dead-click-target class). **medium**
- Empty/intent state reads as a void rather than an inviting surface. **medium** (§7 forbids "nothing here" voids)
- Missing safe-area/edge padding top or bottom. **medium**
- ADVERSARIAL-seed stress (when present): long title wraps gracefully; a null title never renders "null"; empty chips array leaves no ghost row; 7 near-identical cards don't read as a broken repeat; the eating-out card is properly de-emphasized. **high**

## (d) Improvement — ranked, actionable, NON-GATING
Not pass/fail. Each: **what** (the element), **why** (tie to a Guidelines principle or a reference app — Crouton/Flighty/Mela), **suggested change**, **effort** (S/M/L). Rank by impact. This feeds polish rounds and gives Griffin a menu; it never fails a build.

## Output shape (per run → `critique.md` + a summary)
Per state: the four sections with findings `{severity, section, issue, where}`; then a run summary `{blockers, high, medium, polish, gate: PASS|FAIL}`. Keep it skimmable — Griffin may read it.

## Known caveats to hold in mind
- **Viewport is 390px**, briefs assume 430px — do NOT penalize proportion differences that stem purely from the narrower width; it's intentional (stresses truncation).
- **Layer A content is fake** (placeholder "Seeded …" meals) — do NOT judge content *quality* here (variety, chip phrasing). That's Layer B's job. Layer A = form only.
- No reference image exists yet (Figma deferred), so layout is judged spec→pixel, not pixel→pixel. Reserve the vision judgment for what only pixels show; push every checkable fact into the correctness section.
