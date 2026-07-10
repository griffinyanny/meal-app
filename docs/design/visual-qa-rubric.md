# Visual QA Rubric — the judge's constitution

How Claude critiques a captured screenshot. Grounded in `Guidelines.md` (the visual system) + `brief-plan-states.md` (per-state briefs). Purpose: catch "the code says one thing, the screen shows another" and surface polish, **before** Griffin reviews. Structured to keep the judgment consistent and anchored, not vibes.

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

## (b) Design-system adherence — binary checklist, each cites Guidelines
PASS/FAIL each; a FAIL on a §7 hard rule is a blocker.
- [ ] Dark mode: warm near-black bg (`#0E0E10`–`#141418` family), NOT pure black, NOT light mode. (§4 Color, §7)
- [ ] Glass surfaces: cards read as translucent/layered, not flat opaque boxes. (§4 Components)
- [ ] **No emojis in app chrome** (headers, buttons, labels). (§6, §7 — hard rule)
- [ ] Single accent color, used sparingly for CTAs/active states only. (§4 Color)
- [ ] No floating AI FAB / sparkle button. (§3, §7)
- [ ] No persistent chat/input bar pinned to the bottom. (§3, §7)
- [ ] Named/descriptive loading states, never a bare spinner. (§5, §7)
- [ ] No confetti / celebration / "You did it!". (§7)
- [ ] No bright-on-bright color stacking. (§7)
- [ ] No cartoon/mascot/"No X yet!" empty-state art. (§7)
- [ ] Bold typographic hierarchy (confident headers vs muted meta). (§4 Typography)

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
