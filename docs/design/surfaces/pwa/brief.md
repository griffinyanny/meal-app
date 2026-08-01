# PWA (Phase 1F, Workstream C) — GENERATE brief

> **This is a to-generate brief, not an as-built record.** Five artifacts that exist in no spec and no
> mock. Griffin runs this in the meal-app Claude Design project; Claude Code builds the result in real
> components. Loop + round-trip mechanics: `../../design-workflow.md`.

## Why this surface gets a design pass at all

Workstream B applied a locked spec to screens that were already designed, so a design round there would
only re-litigate settled decisions. **C is different: the icon, the launch screen, the install prompt and
the two offline states are net-new surface described nowhere.** It is also the surface Griffin sees every
time he opens the product from his home screen, and it is what the two validation weeks run on — so a
gap here spends an uncompressible resource on a configuration that isn't what ships. (Decision: S52,
reaffirmed S59. `../../../scope-1F.md` → Workstream C.)

## The five artifacts

### 1. The app icon — the mark
The one true net-new decision. There is no mark today; `layout.tsx` carries the name `Meal App` and
nothing else. **Starting position: the chef orb.** Spec §02 argues the case itself — *"a bare glowing
sphere is the single most generic form in the category; every assistant has one. The toque is the
cheapest possible thing that makes this one specific."* An app icon is exactly the place that argument
has to hold, because it sits in a grid next to thirty other rounded squares.

- **Draw it at 1024×1024**, one artboard, and it gets downsampled to every size mechanically. Do not
  produce a size set by hand.
- **The orb at rest.** No ring, no steam — §02 gates both at 64px+ and they turn to noise once the icon
  renders at 120px on a home screen. The toque **is** in (its threshold is 40px, and the sphere clears
  that at every size iOS renders).
- **Full-bleed warm floor, not a transparent orb on white.** iOS applies its own rounded-rect mask and
  does not composite transparency; a transparent PNG gets a black box.
- **⚠️ The one rule that bends here:** §02 says one orb per screen, never two. An icon is not a screen.
  Generate the orb as the whole subject.
- Keep a **safe zone**: nothing meaningful in the outer 10%, because Android masks icons to the device's
  shape. Both phones are iPhones, so this is correctness insurance rather than a live requirement.

### 2. The launch screen (splash)
Shown on cold launch for roughly half a second to two seconds before the app paints. iOS needs a real
image per device size; there is no CSS involved.

- **The floor colour plus the mark, centred, and nothing else.** No spinner, no progress, no tagline —
  a splash that shows a spinner is claiming to be doing work it is not doing.
- It should feel like the app is **already open and about to show you something**, which means it wants
  the same `light.ambient` wash the content screens carry rather than a flat fill.

### 3. The install prompt
**iOS Safari has no install API** — `beforeinstallprompt` does not exist there — so this is a
hand-written instruction sheet, not a system dialog. It teaches one gesture: tap Share, then
*Add to Home Screen*.

- Reuse the **existing bottom-sheet vocabulary** (L4 chrome, the sheet geometry already in the system).
  This is not a new component family.
- **One filled cream button** in the viewport (law 06) — and note the honest awkwardness: the primary
  action here is a thing the *user* must do in Safari's own chrome, which the sheet cannot perform. The
  sheet's own button therefore dismisses. Design for that truth rather than around it; a cream button
  labelled "Add to Home Screen" that doesn't add to the home screen is a lie.
- It must be **dismissible and must not nag.** Draw the dismissed state's re-entry point too.

### 4. The offline grocery list
Standing in a shop with bad signal, opening the app to work the list. **The list is there and correct**
(it is served from a persisted cache), and the app has to say so without alarming anyone.

- ⚠️ **Not gold and not amber.** The gold line is that gold marks *the chef speaking*, and §01 has
  deliberately no caution hue **because amber is the chef**. "You're offline" is the app reporting a
  mechanical fact about the network, so colouring it gold or amber says the chef is talking when the
  chef is not. This is BUG-045's exact finding one surface over — that bug was an amber "already on your
  list" notice, which is the same category of mechanical fact. **Muted, structural, quiet.**
- Being offline is **not an error state.** No retry button, no failure iconography. The list works.
- The one thing that genuinely does not work offline is generating a new list. Draw what that refusal
  looks like when the user reaches for it.

### 5. The queued-changes indicator
Ticking items offline. Each tick **holds** rather than failing, and flushes when signal returns.

- Draw three moments: **holding** (N changes queued), **flushing** (reconnected, syncing), and the
  **resolution** — which should be a disappearance, not a success banner. Confirming that a thing you
  already saw happen has now really happened is noise.
- The tick itself must look **identical to an online tick.** The whole point is that the shop doesn't
  feel different. The indicator is ambient, not per-row.

## Inherit, do not invent

The design-system pass is **DONE** as of S58 — the type ladder, motion, the component library and the
caps rungs all closed. `../../PROJECT-CONTEXT.md` carries the current tokens and the ten type rungs;
read it, and treat any new colour, radius, type size or component family as drift to correct.

Two rungs are assigned by **who is speaking**, never by size: `.spec-chef-voice` (14.5 italic gold) and
`.spec-spoken-headline` (26). Nothing in this brief is the chef talking — an install instruction and an
offline notice are the app, not the character. **Neither rung applies to any of it.**

Radii sit on the eight-rung scale (7/9/12/14/16/18/22/46). Surfaces sit on the elevation ladder; the
install sheet is **L4 chrome**, the offline indicator is not a toast and should not be **L5**.

## Explicitly NOT in this pass

- Offline *generation* of a plan or a list. The app is honestly useless without the model; the scope is
  an offline **read** of an already-generated list plus queued check-off.
- Push notifications, a native app, or anything needing a capability the web does not have. Those are
  the trigger conditions for reopening the native question, not part of R1.
- A redesign of the Groceries list itself. Only its offline and queued states are new.

## Open — Griffin's calls, and they are the reason this is a pass rather than a build

1. **Is the mark the orb?** It is the product's one existing brand object and §02 argues for it. The
   alternative is a food-derived mark, which is the category's other cliché and says nothing about what
   this app actually is (a chef who knows you, not a recipe box). **Recommendation: the orb.**
2. **When does the install prompt appear?** Automatically on the second or third visit is the
   convention; a quiet entry in the You tab never interrupts but is also never found. **Recommendation:
   automatic, once, dismissible forever** — with two users, a prompt nobody sees is worse than one shown
   at a slightly wrong moment.
3. **How loud is "offline"?** A persistent bar the whole time, or a one-shot line that settles into the
   queued-changes indicator. **Recommendation: one-shot then ambient** — a bar that sits there for the
   length of a shopping trip becomes furniture and stops being read.

## Hand-back

Griffin picks a direction in Claude Design and hands the URL back. Claude Code fetches with
`DesignSync.get_file(projectId, "<name>.dc.html")` — note that `import-claude-design-from-url` rejects
the pasted app URL, so parse the projectId out of it and use `get_file`.

The icon comes back as **one 1024×1024 artboard**; every raster size is generated from it in the build,
so the design pass produces one image, not a folder.
