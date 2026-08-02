# Idea Backlog - Meal Management App

## Incoming (S60) — surfaced building the offline half (1F/C)

- **Offline `addItem` — V1.5, and it is blocked on a product answer, not on plumbing.** The queued
  check-off persists and replays exactly one mutation (`grocery.checkItem`), because that is the scope
  Griffin widened to in S59: *in a shop the verb is tick*. Adding an item offline is one line in
  `OFFLINE_MUTATION_PATHS` plus one `mutationFn` default — **except that `addItem` runs an AI categorize
  pass (`tidyItem`) that cannot work without a network.** So the real question is what an offline-added
  item *looks like* before the chef has seen it: does it sit uncategorised at the bottom, does it guess a
  category locally and correct itself on reconnect, or does the quick-add field simply say it needs
  signal? **That is a design question, and it is exactly the kind that should not be answered by whoever
  happens to be adding a line to an array.** Worth pairing with C's offline design artifacts if the answer
  turns out to be cheap.

- **Verify the cold-start mutation replay on a real phone — do this during validation week 1.** ⚠️ **The
  one path in the offline feature that no automated layer can reach.** OF3/OF4 cover a tick that pauses
  and flushes within one page session; the case that actually happens in a shop is a tick, a 45-minute
  pocket, and iOS evicting the backgrounded PWA. The code handles it (paused mutations are persisted and
  `registerOfflineMutationDefaults` gives them a `mutationFn` to resume into) but **Playwright cannot
  reproduce a process kill**, so it is verified by construction and unit guard only. Concretely: tick two
  items in airplane mode, force-quit the app from the app switcher, relaunch still offline, confirm the
  ticks are there, then re-enable signal and confirm they reach the server.

- **Extract a shared `CookedBadge` if a third call site ever appears.** BUG-050 was two hand-rolled copies
  of one badge drifting apart, and the repo's rule is extract at 3+ repetitions — so the guard in
  `caps-rungs.test.ts` asserts the call-site list is **exactly two** and says so in its failure message.
  The third one is the moment to stop asserting and start extracting.

## Incoming (S59) — surfaced opening the PWA (1F/C)

- **Full-screen under the status bar (`black-translucent` + `env(safe-area-inset-top)`)** — 1F/C, with the
  design artifact. `statusBarStyle` ships as opaque `black` because translucent extends the web view *under*
  the status bar and **there is not one `safe-area-inset-top` anywhere in `src/`** — every inset in the app
  is `-bottom`, for the tab bar. Translucent today puts every screen title under the clock on a notched
  phone. Going translucent is the better look and it is a real, contained piece of work: one top inset in
  the app shell, then verify on a device. It belongs with C's full-screen design artifact rather than
  smuggled in beside a meta tag.
- **Re-derive every ratchet constant against its own assertion, once** — 1F/D or sooner. `type-scale.test.ts`
  shipped at `CEILING = 71` while measuring **26**. The other source-scraping guards (`palette.test.ts`,
  `globals.test.ts`, `config.test.ts`, `shell.spec.ts`'s hit-target allow-list) were never checked the same
  way. ⚠️ **A ratchet set above its own subject is not a ratchet**, and the failure is invisible precisely
  because the test passes. Cheap: set each to an impossible value, read the real count off the failure,
  set it back tight.
- **A "workstream blast radius" step in Phase 0** — process, not code. C's two most consequential findings
  (gate 1 killing the installed app, the manifest 404 making it a bookmark) were both **auth and access**,
  and neither appeared anywhere in C's filed bullet list. The existing Phase 0 discipline measures *the
  items*; nothing asks **which subsystems the artifact touches that the list does not name.** Worth one
  explicit question at the top of each workstream.
- **Icon artwork beyond the placeholder** — 1F/C, the design pass. The shipped mark is spec-faithful
  (`.ember-core`'s gradient + lucide's toque) but it is not designed. Replace `src/assets/app-icon.svg`
  and run `npm run icons`.

---

## Incoming (S58) — surfaced closing the type scale (1F/B8b)

- **[1F/D or V1.5] The CONTROL scale needs the same treatment the type scale just got: 13 sizes against
  §08's three.** B8b routed 169 content sites onto §05's ten-rung ladder and deliberately left **84 control
  sites alone**, because §08 governs button type and §05 does not — the spec's own gallery draws controls at
  **15 / 14.5 / 13.5px**, and 15px is pointedly *not* a §05 rung. That boundary is right. ⚠️ **But the
  controls behind it are exactly as scattered as the content was:** 13 distinct sizes, including 21 sites on
  Tailwind's `text-sm`, 12 on `text-[13px]`, and one-offs at `0.9rem`, `0.95rem`, `0.8rem`, `16.8px`. It is
  the same defect one section over — **no control rung exists as a class, so every button label is
  improvised** — and it is why 71 hand-typed sizes survive B8b's ratchet. **The work is the same shape and
  already proven:** name §08's three rungs as classes, route by control height (48 → 15, 44 → 14.5, 36 →
  13.5), and let `type-scale.test.ts`'s ratchet fall. ⚠️ **Why it was not done in B8b:** it restyles every
  button in the product under a heading that says "type scale," and button type interacts with hit targets
  (B3/BUG-048) and with §08's one-filled-cream-button rule (`SH4`) in ways the content ladder does not.
  It deserves its own item and its own `/visual-qa` pass.
- **[V1.5] `.spec-screen-title` (32px) has two call sites and neither is a tab.** §05 states a screen title
  is 32/700, but Plan's and Groceries' `<h1>`s are **26** by the designs Griffin ran, Recipes' was a bare
  shadcn `text-2xl`, and the recipe detail's is **22**. B8b put all three tab titles on 26 together and left
  32 for the standalone login / no-access pages, **deliberately not resolving the divergence** — promoting
  designed surfaces to 32 is a design change, not a mechanical one. **Griffin's call**, and the natural
  moment is the C design pass, when a home-screen app's header hierarchy is on the table anyway.

## Incoming (S56) — surfaced building spec §09's one control (1F/B7)

- **[V1.5] Wire the mic — speech-to-text — and it is now a ONE-COMPONENT change.** R1 is text-only by
  Griffin's S35 call, and S56 reaffirmed it by shipping the mic **unwired on all six surfaces** (literal §09
  conformance). ⚠️ **What changed is the cost, not the decision:** before B7 there were six different
  freeform controls, so dictation meant six integrations; now `shared/freeform-field.tsx` is the only place
  a mic exists, and wiring it closes every surface at once. The Web Speech API (`webkitSpeechRecognition`)
  is free and supported in Chrome and iOS Safari, so the real work is permissions, the listening state
  (§09 already draws it: the mic fills cream and a line appears beneath the field) and a graceful refusal
  where the API is absent. **Revisit at V1.5, or sooner if the validation weeks show Griffin or his wife
  tapping the mic** — six dead mics in weekly use is the honest cost of the S56 call, and that tap is the
  signal.
- **[B8] The `bg-primary` audit should ask what the hue CLAIMS, not just how many carry it.** Two sessions
  produced two filled-cream findings and both were **states wearing the primary rung** — S55's Recipes
  filter chip, S56's Groceries organize toggle. Neither was an action. The 32 `bg-primary` call sites should
  be sorted by *what they mean* (a primary action / a selected state / a list marker / a badge) before
  anything is repainted. Start with the You tab's `Talk to the chef`: a filled cream button wearing a **mic
  glyph** that opens a field.

## Incoming (S55) — surfaced closing the S48 critic slate

- **[V1.5] A `Favorites` door in the picker.** The critic's vocabulary finding carried a second clause —
  *"Also: `Favorites` probably belongs in the picker"* — and S55 deliberately did **not** build it. Unifying
  the two surfaces' words is a rename; adding a door is a new browse tile with its own count, suppression
  behaviour and place in the four-tile budget that frame `3e` already spends on the night's constraint.
  ⚠️ **The argument for it is real** and should not be lost: favouriting is the strongest explicit signal
  the library has, and the picker is the one screen where "what do I actually like" is the question being
  asked. **The argument against is the tile budget** — `browseTiles` already suppresses doors that duplicate
  `All`, and on a small R1 library `Favorites` will frequently BE a duplicate or a zero. Revisit when a real
  library is big enough for the door to be honest, which is a validation-week observation rather than a
  design call.

## Incoming (S47) — `ux-design-critic`'s staged findings — ⚖️ DISPOSED S48 (2026-07-30)

**Griffin ruled on all sixteen in S48** (decisions.md, "The critic's slate"): **eleven applied** (the
fixed picker pane, the receipt line, the fit-counting opening line, un-dim on selection, door
suppression, the eyebrow glyph fix, the opening cap, the door refile on both sheets, honest
empty-library doors, the radius rung, the search-field removal), **two rejected** (hierarchy inversion —
the critic's measurement was wrong, the copy trim was applied instead; loudest-object inversion — the
chef primary stays), **four retagged [1F]** (the `+` weight, vocabulary unification, cooked-when
evidence, caps-label tracking — kept below). Original findings retained for the record:

- **[1E.5 taste] Multi-select is illegible across sections.** One checkbox visible, the second pick
  unnamed and unreachable except by `Clear` (which is drawn at the caption colour, the palette's stated
  floor of legibility). Proposed: the support line above the verb stops restating the verb and becomes the
  receipt — *"Carbonara and the green beans."* No new object.
- **[1E.5 taste] The picker has four different heights** — 176 / 274 / 365 / 400 / 515px across states,
  because the drawer is `h-auto` with `max-h-[80vh]`. The frame draws a fixed pane. **This reframes the
  logged "76 vs 176px" item**: it is not a number, it is that the walls move 339px when you push a door,
  and the week behind appears and disappears as you browse. Fix the sizing first; then the 76-vs-176 call
  is a ten-second taste decision instead of a judgement about a moving target.
- **[1E.5 taste] The chef's opening line contradicts the rows under it.** *"3 of these have been waiting —
  you've got 30 minutes"* sits directly above two rows reading *longer than Friday allows*. Proposed:
  *"Three have been waiting. One of them fits your thirty minutes."*
- **[1E.5 taste] Overruling the fit constraint is allowed but unacknowledged.** A selected unfittable row
  keeps `opacity-55`, so it renders as *dimmed and pre-checked* — the universal grammar for a bug. The
  permission itself is right and should stay; the silence is the problem. Proposed: un-dim on selection,
  and let the support line absorb it (*"The lamb needs three hours, so I'll find it a different night."*).
- **[1E.5 taste] Two of the four browse doors are the same door.** `recentlySaved()` is `.slice(0, 12)`,
  so for any library under 13 recipes `Recently saved` and `Everything` are the identical set — the
  majority case for R1. Proposed: suppress a tile whose count equals `Everything`'s, and suppress 0-count
  tiles. Two honest doors beat four with two fake.
- **[1E.5 taste] The empty library's hierarchy is inverted against its own frame.** `3d` draws
  `Nothing in here yet.` at 22px and the invocation line at 19px; the build has 16px and 22px. The critic
  argues this — not copy length — is why the gold block dominates, and that trimming the copy would treat
  a symptom and cost the best sentence in the state.
- **[1E.5 taste] The empty library's loudest object is the exit.** `Let the chef write it` is the one
  filled cream button; the two doors that would actually fill the library are quiet rows. Proposed:
  invert the weight.
- **[1E.5 taste] The gold budget on `picked-row` may have crossed from known to broken.** The boundary
  sentence is now typographically identical to seven cheap rationales, so the one sentence that had to be
  singular is item one of eight. Proposed: rationales to `text.body`, keep the `→` in gold. **Explicitly
  Griffin's**, since §D accepts five gold rationales.
- **[1E.5 taste] `DINNER · PICKED` breaks the rail's left edge.** The bookmark is `inline`, so the picked
  row's eyebrow starts ~15px right of every other row while its title stays flush; and `PICKED` joins in
  third position, two segments from the glyph that marks it. Two one-line changes. **The critic's explicit
  "leave this alone" is the decision itself** — flat type, no accent, no badge.
- **[1E.5 taste] The opening list has no cap; frame `3b` gave it one** (three rows + `Six more`). At the
  frame's own 48-recipe scenario the four doors fall hundreds of pixels below the fold.
- **[1E.5 taste] The empty library's two doors share one destination** (`/recipes`), and one of the two
  labels promises something the destination does not do.
- **[1E.5 taste] The meal sheet files the library door as navigation.** `Cook something I've saved` sits
  under `TAKE IT SOMEWHERE` beside a read-only link, though it rewrites the night. Proposed: move it under
  `ASK ME FOR A CHANGE`, beneath `Swap the whole meal` — the two together are the thesis in two lines.
- **[1F] Recipes' `+` is now the loudest object on the screen.** A filled cream 44px square, so manual
  recipe entry outranks the screen's actual job. Proposed: `action.soft`.
- **[1F] Two vocabularies for one library.** Recipes says `All` / `Favorites` / `Cooked`; the picker says
  `Everything` / `Cooked before` / `Recently saved` / `Imported`. The two surfaces are now adjacent in one
  flow. Also: `Favorites` probably belongs in the picker.
- **[polish] Nested radius skips a rung** (sheet r22 → contents r14; §11 says step one, and the frame drew
  r18), **the pushed door shows no evidence of its premise** (rows inside `Cooked before` never say when
  they were cooked), **three tracked-out caps labels in one sheet**, and **the empty library kept a search
  field frame `3d` deliberately omitted**.

## Incoming (S46) — surfaced building 1E.5 Slice 2 (W8 + W10)

- **[V1.5, with household sharing] §B's who-clause on a picked meal.** The ledger draws
  `Griffin's pick · 40 min · scaled to 3`, and the rule that provenance is **never a possessive in the
  eyebrow** exists precisely *because* a second person will one day be in the household. The meta renders
  `40 min · scaled to 2` today and stops there: the clause needs a display name, R1 has no surface that
  holds one, and inventing a source to render "Griffin's" for a solo user builds the hardest half of a
  V1.5 feature for zero present value. **Ships with household sharing UI**, where the name becomes real.
- **[V1.5] §B's "too many picks → two options" conversation (frame `3m`).** `MAX_PICKS_PER_ASK` is 4 and
  the picker will hand the chef four; what does not exist is the *conversation* — a pre-selected
  recommendation ("two this week, two stay in your recipes") and its alternative, with the chef's reason
  being a **cooking** reason rather than a capacity one. It is a distinct screen with its own primary, and
  it only fires when the chef judges a week over-constrained — a judgement generation is not currently
  asked to make. **Deliberately not built (S46)** rather than quietly skipped.
- **[1F] The eight-way duplicated cookability test.** `slotType === "recipe" || slotType === "leftover"`
  appears in eight places, two of them in the grocery collector. S45 chose a `picked_recipe_id` column
  over a `slotType` enum value *partly* to avoid touching all eight — which means the duplication is still
  there, still load-bearing, and still one missed call-site away from silently dropping a deliberately
  chosen meal from the shop. Nothing depends on fixing it, which is exactly why it will not get fixed by
  accident. One shared `isCookable()` predicate.
- **[1F] The picker cannot reach a recipe that is not in `recipe.list`'s first 200.** The picker derives
  from the same cached list the Recipes tab uses, capped at 200 by that query. Correct for V1 household
  scale (dozens) and it keeps the picker free to open; it becomes wrong at a few hundred saved recipes,
  and the failure is silent — the recipe simply is not there. Revisit with pagination or a dedicated
  picker query if the library ever gets large.

## Incoming (S44) — surfaced building 1E.5 Slice 1

- **[1E.5 Slice 2 / V1.5] The meal sheet's `Move it` group.** Wave 1's settled meal-sheet drawing carries
  a third group — `Move to another day` and `Skip Tuesday` — grouped separately *because they change the
  week rather than the meal*. It is in **none of W7's scope bullets**, drag-to-move is explicitly V1.5,
  and `Move to another day` needs a day picker that is neither drawn nor scoped. **Deliberately not
  built** (S44) rather than quietly added. `Skip tonight` is the cheaper half — the modify pipeline
  already clears a night to `eating_out` — and would slot in with Slice 2's sheet work.
- **[1F] Compact rows truncate the title at ~20 characters.** The nested row spends a fixed 62px on its
  meal-type label plus a trailing slot on the cook time, leaving the title — the thing being scanned —
  the remainder. Not reachable today (R1 generates dinners only, so no day is ever nested), which is why
  visual-QA graded it medium. Revisit when lunch/breakfast generation ships.
- **[1F] Seven gold rationales reads as texture rather than voice.** The ledger licenses one per dinner
  ("fifteen meals still produce five gold marks"), and at five it reads as the chef making a case per
  night. At seven it starts reading as a typographic treatment applied to a list. Cheapest lever if it
  bothers Griffin: drop the rationale on days already past on the mid-week screen.
- **[V1.5] `plan.modify` should return `changedSlotIds`.** Already tracked as BUG-023; restated here
  because W3's toast made the row-level ring visible enough that the day-level fallback is now the one
  imprecise thing left in the modify loop.
<!-- ⑂ S48 merge: the section below is from the concurrent main-checkout sessions. -->

## Incoming (S44) — Griffin, 2026-07-30

*Two ideas that are really one: **add to the grocery list without opening the app.** Filed as a cluster
because they share a spine, and separated by door because the doors have wildly different costs.*

- **[V1.5 probe → V4 native] Zero-app add-to-list — the cluster.** Griffin (S44): "I want to say it to
  Alexa or Siri, or tap a button on my home screen, and it lands on my list." The unit of value is
  **capture at the moment of noticing** (you open the fridge, you're out of olive oil) rather than a
  planning session. Everything below rides the same prerequisite, so scope the prerequisite once.
  - **The shared spine (build this first, it is the only genuinely new thing):** a **stable
    authenticated add-item endpoint** that takes a raw natural-language string and a household token, and
    an **out-of-band auth token** for it (Supabase session cookies do not work from a Shortcut, a widget,
    or an Alexa cloud function). **The parse already exists** — the `grocery-talk` NL→ops task and
    `grocery.talk` router (S26) already turn "we're out of olive oil and grab tortillas" into list
    operations with `[N]`-ref ID-safety. So the AI half is done; this is an auth + surface-area problem.
    Build the spine once and Siri, a widget, an Alexa skill, and the V2 share-extension all ride it.
  - **Door 1 — Siri, via a user-installed Shortcut. The cheap probe, and it needs no native app.**
    The iOS Shortcuts app can POST to a URL with a token, so "Hey Siri, add to my grocery list" works
    against the spine above with zero App Store presence. Doubles as the **behavioural probe**: it answers
    "do I actually use voice-to-list, or do I just think I will" for the price of an endpoint, *before*
    anyone pays for a native build. **Recommended first move.**
  - **Door 2 — iOS home-screen / Lock Screen / Control Center widget. Native-only, no way around it.**
    WidgetKit + App Intents require a real iOS app; a PWA cannot draw a home-screen widget. Griffin's
    framing is an **action** widget (an `＋ Add to list` button, and a mic) rather than the display widget
    already sitting in V4 — worth keeping distinct, because a widget you *press* is a different feature
    from a widget you *read*. **This is a named native trigger** — see decisions.md 2026-07-13, which
    lists "widgets/offline" among the real capabilities that would pull native forward from V4. Pair it
    with the memory `[[project_meal_app_platform_pwa]]`: R1 ships as a PWA and native is held until a
    capability like this justifies it.
  - **Door 3 — Alexa. Real, but it is a product bet, not a convenience feature.** An Alexa Skill means
    account linking (OAuth), Amazon's certification review, and its own invocation-name UX ("Alexa, ask
    *[skill name]* to add olive oil" — the natural phrasing Griffin wants requires more than a basic
    skill). Justifiable if voice-to-list becomes a **differentiator** we market; hard to justify for one
    household's convenience. **Do not build before Door 1 has shown the behaviour is real.**
  - **⚠ Door 4 — Google Assistant is effectively closed.** Google shut down Conversational Actions in
    June 2023 and there is no equivalent third-party voice-app path on Google/Nest devices today. Flagged
    so "general smart home integration" does not get planned as if all three assistants are symmetric —
    **they are not.** Revisit only if Google ships a Gemini-era third-party surface.
  - **Open question this raises:** what does the list do with a bare "add olive oil" that arrives with no
    plan context — does it land in a quick-add bucket, get categorised by `tidyItem`, and does it survive
    the next plan's list regeneration? The regeneration interaction is the part most likely to bite.

## Incoming (S41) — harvested from the 1E.5 Plan design pass

*Everything below surfaced during the Claude Design waves for Plan (`Plan Directions.dc.html`,
`Plan Horizon.dc.html`, snapshotted under `docs/design/surfaces/plan/`). Several are capabilities the
**design drew as if they existed** — those are marked ⚠ and were deliberately cut from the drawings so
they don't reach the build by accident.*

- **[R1 — NEEDS A SCOPE CALL] Cook a recipe you already have: library → plan.** The biggest gap the pass
  found, and it has no prior backlog entry. Recipes flow **into** the library four ways (generated, URL
  import, favourited off a plan, cooked) and **nothing flows back out** — there is no way to say "I want to
  cook this specific thing this week", which is mainstream behaviour we have no answer to. The data spine
  already supports it: `meal_plan_slots.recipeId` is an FK to `recipes` with a `recipeStatus` lifecycle, and
  the grocery pipeline reads ingredients off the recipe row, so this is a UI + generation-prompt problem, not
  a schema one. **Two primitives cover five entry points:** a **picker** (invoked from the intent screen, a
  day, or a meal sheet) and an **"Add to this week" verb** that lives on a recipe wherever a recipe appears.
  **The framing that keeps it on-thesis: a chosen recipe is a CONSTRAINT ON THE CHEF, not a replacement for
  it** — the chef still picks the night, builds around it, shops for it and spends the leftovers. Designed in
  full (picker, the chef's answer + servings, the pinned card, the mixed week, regenerate-with-pins,
  modifying a meal you own, the chef pushing back). **Two build consequences to carry:** `slotType` has no
  value meaning "the user chose this", and a library recipe may have no `normalized_ingredients` cache, so it
  would hit the normalize path at confirm — the exact latency BUG-004 exists to prevent.
- **⚠ [V1.5] Held-recipe queue + reminder.** From the chef-pushback screen: "two now, two in the queue — the
  other two wait for next Sunday and I'll remind you." Needs a held-recipe concept, a surface to see and
  manage it, and a reminder trigger. **Cut from the R1 drawing** (Griffin, S41) — the option now reads "two
  this week, two stay in your recipes", which needs no new concept because they are already saved.
- **⚠ [V1.5] Chef deferred decisions — the chef withholding on purpose.** From the null-title slot:
  *"Wednesday depends on how much chicken Monday leaves. I'll settle it Tuesday night."* A slot the chef
  deliberately leaves unwritten and resolves later on its own. Arguably the product thesis in one sentence
  and no competitor does it — but it needs a resolve trigger and a fallback for when the user doesn't open
  the app that day. **Cut from the R1 drawing** (Griffin, S41); the slot keeps "Decide now" only.
- **[post-1E.5] Stale-library nudge as an intent chip.** Griffin chose the quiet door (`1b`) for the intent
  screen over the version where the chef proactively offers recipes you saved and never cooked — the
  proactive block only fires when stale candidates exist, so the door has to exist underneath it anyway.
  What's deferred is the moment the chef *volunteers*. Cheap way back to it later without new furniture: the
  intent screen already has a chip row, so a stale-library nudge becomes a chip variant (`Cook that lamb
  ragù`). The staleness read itself moved **into the picker** as content rather than a sort order.
- **[1F — re-tagged from 1E.5, S43] Rate-the-week screen.** "Rate them" needs a destination — at eighteen meals a row of thumbs is a
  screen, with a bulk affordance ("They were all fine — marks the twelve and closes this"), two states per
  row rather than five stars (the chef needs a direction, not a score), and only cooked meals listed because
  a skip is already an answer. The primary is **"Save and plan next week"**, not "Done" — rating is a step in
  the ritual, not a chore with an exit. Also what gives week-wrapped somewhere to live. **Re-tagged 1E.5 → 1F (S43):** this is a *new screen* with its own primary and a bulk affordance, not a Plan state — a fidelity rebuild should not grow a screen. 1E.5 renders week-wrapped on the rail; where "Rate them" *goes* is 1F's.
- **[V1.5] Repeat a week in one tap.** From the week-wrapped close-out: *"Save the carbonara week — cook the
  whole thing again in one tap."* Nothing in the system saves or replays a week today. Pairs with the
  library-into-plan work above (a saved week is a set of pinned recipes).
- **[V2 — partially pulled into 1E.5, S43] Spend readout on the week.** Week-wrapped shows `12 cooked · 3 skipped · $94 spent`. We have no cost
  model for a plan or a grocery list at all, so the number is currently fictional. Either drop it from the
  design or scope real cost estimation — it pairs with the existing grocery-ordering (V2) and pricing work.
- **[post-MVP] The chef learns from skips.** *"You skipped Thursday, which you always do, so I'll stop
  planning it."* An inference over behaviour that turns an observation into a decision. Sits with the already
  deferred "proactive pattern-detection nudges" item from 1E — same class, and this is the well-mannered
  version (a stated conclusion, not a nag).
- **[1E.7 / 1F] Recipes tab bottom edge, per spec §07 Fix 2.** The pinning verb takes the Recipes screen's
  single floating primary ("Add to this week"), which means the shipped floating search/＋ toolbar from the
  1D reorg goes: the FAB is deleted, search moves into the header (pattern B), and exactly one object floats
  above the tab bar. Already specified by the spec; the design pass made it concrete. **Consequence: the
  1E.5 build touches Recipes, not only Plan.**
- **[1E.5 — Wave 2, and bigger than it was billed] Divergence: a confirmed week where Tuesday didn't get
  cooked.** The finished Plan spec lists this as one of four cheap Wave-2 frames. It isn't. **Not cooking a
  planned night is the normal case**, not an edge case, and it cascades: what happens to the grocery list
  that was already written, to the leftover chain the next night was eating off, and does the chef re-plan
  or simply record it. `1w` already built the machinery — the broken-leftover repair, where the gold italic
  rationale is replaced by destructive body text in the same slot with two one-tap repairs — but it fires on
  an *edit*. Divergence is the same machinery triggered by **inaction**, which means something has to notice
  the night passed uncooked. `3j` (the confirmed week) is the calm case and is drawn; this is the other one.
  Design it before the 1E.5 build scopes the confirmed-week states.
- **[1E.5] Non-contiguous weeks are drawn but unscoped.** "Not here Monday and Tuesday, I want Thursday and
  Friday, three dinners." The dated rail hosts it unchanged, but the generation side (a week as a *set of
  chosen days* rather than seven slots) has never been specced.

## Incoming (S40)

- **[1E.5] Dish titles repeat their intent's verb — "Grilled X" seven times.** Layer B (S40) on the
  "I want to grill" intent returned seven dinners whose titles *all* begin with "Grilled". The week
  underneath is genuinely varied (7 distinct proteins, 7 distinct dish forms) and the intent is explicitly
  grilling, so this is **not** the S19 "7× grilled salad" failure — it is a *titling* problem, not a
  variety problem, and it predates S39. But as a scannable list on the review screen it reads as a wall of
  one word. Worth solving when Plan is rebuilt: either vary the title's lead noun, or let the card's
  method live in the tags where the repetition is honest and cheap. Evidence:
  `tests/e2e/captures/B-2026-07-27T02-51-29-888Z/live-grill.png`.
- **[1F] Guesses and facts look identical on the sparse reflect screen.** `WHAT I'M GUESSING, UNTIL YOU SAY
  OTHERWISE` uses the same `spec-glass` treatment as `WHAT I'VE GOT`; only the eyebrow and the inline icons
  distinguish an assumption from something the user actually said. Correctly *not* red (a gap is not a
  warning — that was the deliberate S39 call), but a third treatment between "fact" and "warning" would
  make the honesty legible at a glance.

## Incoming (S39)

- **[1F — ✅ SLOTTED S60 as Workstream E] In-app feedback capture → LLM-cleaned → ticket** — Griffin (S39). ⚠️ **Status
  note (S60):** this was silently cut by S49's *no closed beta* fallout list (a bundling error) and is now **reinstated
  as 1F Workstream E** with a scoping gate (E0) + build (E1). **Two of the vision's specifics did not survive first
  contact:** `getDisplayMedia` is unsupported on iOS Safari so the **screen-recording half is not buildable** in mobile
  Safari (native screenshot + file input replaces it), and **the Linear destination is not recommended** — a Postgres
  table Claude sweeps at session start is the same "agent picks it up" queue without the integration, so **S19's Linear
  trigger moves to real users rather than firing here.** Live spec: [scope-1F.md](scope-1F.md) → Workstream E. The
  original vision, kept verbatim below because E0 is scored against it: he's on
  his phone, hits something wrong, and a gesture (shake, or a persistent small control) opens a capture modal. It
  takes a **screenshot or a short screen recording**, then a second step where he **writes or dictates** what
  happened and what he expected, with an optional dropdown for which feature he was exercising. Submitting
  **auto-attaches the state and event metadata** we'd need to diagnose it (route, seeded/real, preferences snapshot,
  recent tRPC calls, recent analytics events), routes through an **LLM that turns it into a proper bug report or
  feature request** — title, repro, expected vs actual, severity, tags — and **cuts a Linear ticket** already
  organized thematically. Must work for a feature request as well as a bug. **The goal is friction-free feedback
  volume**, from Griffin now and from real users later, so quality of the report is the LLM's job rather than the
  reporter's.
  - **Depends on 1F observability.** The metadata half is worthless without the PostHog event taxonomy (already in
    1F scope), and Griffin's related ask is explicitly about *joining the two*: when he reports "I tapped X and the
    wrong thing happened," we should be able to line his report up against the events that actually fired and confirm
    the backend did what the tap intended. That matters more as usage scales past someone we can watch.
  - **Candidate Linear graduation trigger.** Linear was deferred in S19 with explicit triggers (decisions.md); a
    ticket-cutting pipeline is arguably one. Note the connector needs authorizing from claude.ai connector settings
    before anything can be wired to it.
  - **The small piece shipped early (S39):** `user.resetOnboarding` + the You-tab test-mode card, because the
    onboarding interview fires once per account and Griffin could not otherwise re-test it. The standing principle
    behind it is now in engineering-principles.md ("Griffin has to be able to test it").

- **[1E fast-follow / 1E.5] Make `ALREADY CIRCLING` true, then turn it back on** — S39. The reflect playback design
  has a block naming 1-3 dishes the chef is "already circling", with a reason each. Built OFF (Griffin's call)
  because nothing carries those dishes into generation, making it the same unenforced promise the reflect hooks
  had before S39 demoted them to naming a technique. **To ship it:** derive the dishes deterministically from
  `InterviewState` (same shape as `weekDecisions`) and put them into `planSeedRequest`, so the first plan actually
  contains them. Three named dinners out of five to seven is not over-constraining, and it converts the screen's
  strongest moment from a claim into a commitment. The design already wires the toggle (`showCircling`), so the
  UI half is a flag flip. Risk to check on the real model: named dishes that fight the week's variety rule.

- **[1E.5 / 1F] Snapshot-test the chef system prompt** — found S39. `.claude/rules/test-files.md` says system-prompt
  changes get an inline snapshot so they surface for deliberate review, and CLAUDE.md calls chef-system.ts "the
  single most important file." It is the one prompt file with no snapshot: `grocery-talk`, `preferences-talk` and
  `ingredient-normalize` all have them, `chef-system.ts` has targeted `toContain` assertions instead. An
  ingredient-reuse rule was added to the plan prompt in S39 and nothing flagged it. Small, and it protects the file
  the whole product's voice depends on.

## Incoming (S37)

- **[pre-monetization / native-build] Experimentation + A/B testing platform (pricing first)** — Griffin (S37):
  as the iOS native build productionalizes, he wants to run A/B tests, **primarily pricing tests** (price points,
  trial length, paywall placement/copy, free-vs-paid boundary). Assumes a **third-party vendor**, not homegrown.
  Needs a design pass on *which vendor* and *how it integrates* (flag evaluation on the server/tRPC layer vs. client,
  exposure logging, how assignment survives web ↔ native, how it ties to the analytics already planned for 1F).
  **Two distinct needs, don't conflate:** (1) generic feature flags / experiments, (2) *subscription price* tests,
  which on iOS are constrained by StoreKit — you test among App Store price points, you don't set arbitrary prices,
  and you need a subscription layer that can assign + report on them. Depends on the **LLM cost-per-user model**
  (S35 row below) — the price floor has to exist before testing around it. Ties to the **Monetization Details**
  open question. **Trigger to pick this up:** when the paywall/subscription work is actually scoped, not before.

## Incoming (S36)

- **[V1.5] Per-person meals within one dinner** — Griffin (S36): "need to think about if babies/kids are eating the
  same meals as adults and how to handle that." R1 deliberately plans ONE meal per slot and tells the chef to adapt a
  portion (texture, salt, hazards). True separate kid meals need multiple recipes per slot = a schema change. Belongs
  with **V1.5 Family Member Profiles**, alongside per-member preference sets.
- **[V1.5] Per-member ages + preference profiles** — the `householdComposition` JSONB is shaped to take an optional
  `members` array additively (decided S36), so this lands without a breaking migration.
- **[1F] Onboarding palette consolidation** — the interview introduced an amber chef-presence register
  (`.ember-*` in globals.css) beside the app's blue actions. Provisional by design; the 1F design-system pass settles it.
- **[Post-1E] AI deep-round planner** — the stopping policy is deterministic for latency reasons (decisions.md S36).
  If question ordering ever feels rigid, an AI planner can replace `pickNext()` behind the same interface.

This is the living backlog of ALL ideas — from initial planning, from sessions, from research, from anywhere. Ideas never get deleted from here. They get slotted into a phase, marked as deprioritized (with reason), or left as unphased for future consideration.

**How this works:**
- New ideas get added to "Incoming" with the session they came from
- During planning for each phase, we review the backlog and slot ideas into phases
- Ideas that influenced a shipped feature get marked SHIPPED with a link to what was built
- Ideas that were explicitly rejected get marked REJECTED with a reason
- Everything else stays in the backlog — nothing falls through the cracks

---

## Incoming (New ideas not yet slotted)

| Idea | Source | Notes |
|------|--------|-------|
| **[✅ SLOTTED S60 → 1F Workstream E] In-app bug & feedback capture** | Session 35 (2026-07-24) | ⚠️ **S60: reinstated after S49 cut it by bundling error; now 1F Workstream E** (E0 scope → E1 build). The lightweight tier below is broadly what E1 builds; the rich tier's screen-recording half turned out **unbuildable in mobile Safari** (`getDisplayMedia` unsupported on iOS) and its Linear destination is **not recommended** — see [scope-1F.md](scope-1F.md) → Workstream E for the live spec. Original entry: Griffin wants a super-low-friction "report a bug / feedback" mechanism baked in from day one so he + wife capture issues while using the app. **Two tiers.** *Lightweight (`[1F]`, rides the observability line):* a Settings entry → submit bug/feedback that auto-attaches the flow context he listed — where you came from, current screen + exact state, device/phone details — and logs it. **Big head start: the dev debug HUD already captures this** (`useDebugPanel`/`DebugHud` copyable state blob, shipped S17) — the lightweight version is largely wiring that + device metadata into a user-facing submit. *Rich (post-MVP):* screen-record/screenshot capture + user dictates the problem + an LLM drafts a clean, reproducible ticket → logged to a board where an agent can pick it up and fix it. **The rich tier is the trigger to adopt Linear** (see decisions.md 2026-07-24 — it's the ticket backend + the "agent picks it up" queue). Slot lightweight in 1F; rich is post-MVP. |
| **[1F / post-MVP] LLM cost-per-user model + scaling audit** | Session 35 (2026-07-24) | Two linked deep-dives Griffin wants before monetizing + scaling. (1) **Cost-per-user model:** what one active user costs us in LLM spend (plan-generate, hydrate, normalize, talk, recipe-gen), so pricing sits comfortably above it and a heavy user can't run us negative (the abuse ceiling). Feeds the Monetization open-question. (2) **Scaling audit:** an honest read of how the current setup behaves at 5–10 users vs. what breaks / what we'd have to do if it takes off, and specifically **what could blow up cost-wise** (unbounded AI calls, no per-user rate ceiling, background fan-out). Pairs with the 1F observability line (PostHog cost events + Sentry) — you can't model what you don't measure. Reference: `reference/meal-app-pricing-research.md`. |
| **[1E.5 design input] Chef proactive follow-up / clarification screen ("permission to pop up")** | Session 35 (2026-07-24) | A surface where **the chef asks the user clarifying questions** before/while planning — "you said 'plan my week' — which days? what does 'week' mean here? you're out Tue/Thu, so 3 dinners?" — answered via tappable options + voice. Must be **general, not hard-coded** per scenario. **The S8 interaction paradigm already reserved this slot** — "Tertiary (10%): structured multi-turn clarification through tappable option cards" (open-questions, RESOLVED S8) — but it was never built. A genuine gap in the current Plan flow. **Flag directly into the 1E.5 all-states Plan buildout** — the state enumeration should add a "chef asks YOU a question" clarification state alongside intent/streaming/review. Part of the S35 dynamism vision (below). |
| **[V2 — pairs with freshness/ordering] Split / multiple grocery orders per plan** | Session 35 (2026-07-24) | One plan → **more than one grocery list/order**, so perishables aren't bought a week early. Griffin's cases: an "initial order" now + a "secondary list" for later-week meals (don't buy Sat/Sun fish on Sunday); or **per-shopping-day lists** if the user shops 3 days for freshness. The chef advises the split ("I wouldn't grab the fish until midweek — want a second list?") and the **Groceries page reflects multiple lists**, not one. Data-model implication: a plan's list is currently singular. Connects to "Freshness-aware meal sequencing" (V2) + "Schedule awareness / busy nights" (V2) already slotted — this is the shopping-side expression of both. Also raises the shop-optionality question (all-today vs. which-days vs. staples): start simple (one full-week list), layer this in V2. |
| **[onboarding / post-MVP] Dynamic chef-led first-run tour (distinct from the #4 interview)** | Session 35 (2026-07-24) | A slick, modern first-run walkthrough where **the chef introduces itself and the app** — a guided tour of each tab (Plan/Recipes/Groceries/You) with demo states, teaching the agentic value: *"at any time you can just talk to me — dictate what you mean and I'll interpret it, easier than typing or tapping."* **This is NOT the #4 onboarding interview** (which captures preferences): the tour *teaches the app + sells the value prop*, the interview *learns about you*. Richer, later, likely post-MVP — the #4 design should stay focused. Absorbs the older "In-app guided tour with screen highlights" (S5, Cooklist) + "User education on AI capabilities" (S2). Considerations fed into `open-questions.md` "Onboarding Flow" + the onboarding design brief. |
| **[post-MVP] Progressive feature-disclosure system** | Session 35 (2026-07-24) | How to teach the app's many capabilities over time without overwhelming first-run. Griffin's example: "copy a recipe link from anywhere and bring it into the app" — tutorial it every time (too much), or surface it contextually when the user first lands on the relevant screen? The tension he named: **friction vs. understanding** — lower friction = more people through the door, more understanding = deeper engagement + retention. Wants to play with contextual, land-on-the-page teaching rather than one front-loaded tour. Pairs with the chef tour (above) + "User education on AI capabilities" (S2). |
| **[1E.5 design input] S35 meal-planning dynamism vision (consolidator)** | Session 35 (2026-07-24) | Griffin's throughline across a long musing: the plan + grocery flow should **reshape to the user's real week via voice**, not force "your meals this week" rigidity. He should be able to ramble ("not here Mon/Tue, want Thu + Fri, 3 dinners") and the app knows **which day each meal lands**, handles going-out nights, and lets him **move a meal to another day** (voice / tap / **drag-and-drop**) with the dependency logic that implies (leftovers Fri→Sat; moving a meal a few days out; are the groceries still good). **Most of this is already in the backlog** — auto-infer plan duration/start from intent (S12), move-a-meal-to-another-day + "possibly drag-and-drop later" (S18), schedule-awareness/busy-nights (V2), freshness-sequencing (V2), leftover intelligence (unphased), concurrent plans (S12). This row makes the *vision* legible and **routes the whole cluster as a design input to 1E.5** (Plan is being fully re-designed next — the moment to bake in day-assignment, the clarification state above, and drag/move affordances). New pieces broken out separately: the clarification screen + split grocery orders (both above). |
| **[PHASE 1E.5 — FORMALIZED into the spine, between 1E and 1F] Full Plan-tab visual buildout in Claude Design (all states)** | Session 34 (2026-07-24) | Plan was designed in **Figma** (the original State-1…State-6 briefs) and built in code, but it was **never rebuilt in the Claude Design project** the way Recipes/Groceries were — so it's the one core surface with no all-states mock in the design system-of-record. Griffin wants a **dedicated interstitial phase between 1E and 1F** ("a 1.1 or something") that does a robust, beautiful, from-scratch Claude Design buildout of **every Plan state** before the 1F design-system pass. Bigger than the existing 1F line "visual refresh Plan to Groceries fidelity" (S25) — that assumed a *polish* pass; this is a full all-states *design exploration*. **The brief must be sophisticated** (Griffin's explicit ask): enumerate every state — intent (empty + the onboarding pre-seeded entry, see `surfaces/onboarding/brief.md` "three front doors"), streaming/generating, review (draft), confirmed, mid-week, week-wrapped/elapsed, modify working/ack/error, expanded meal sheet, Talk-to-Chef, plus error/offline — and design each beautifully, accounting for every state we could have. **Gates 1F.** **Brief + kickoff prompt NOT written yet** — Griffin: "I'll let you know when that design is ready," after the 1E interview is locked. **Now formalized as Phase 1E.5 in `scope-v1.md`** (Griffin ratified S34; decimal label keeps 1F + its `[1F]` references intact); it **must ship before 1F**. |
| **[BUG-004 follow-up] Ingredient caching (#3)** | Session 29 (2026-07-21) | A read-through canonical-normalization cache *underneath* `normalizeIngredients` so repeat items ("an onion is an onion") skip the AI entirely. Stacks with the S29 recipe-row cache (that one moved *when* normalize runs vs confirm; this cuts how expensive each call is). **Open decision (→ open-questions):** global (best hit-rate, item strings carry no PII) violates the every-table-has-`household_id`+RLS rule → either household-scoped + rule-clean, or global with a documented public-read/service-write exception. Don't decide it silently in a build session. |
| **[BUG-004 follow-up] True section-by-section grocery streaming (#2)** | Session 29 (2026-07-21) | Write the confirm-time list section-by-section so items appear as each category resolves and the user can act on merged items while the rest lands. **Deliberately deferred (S29):** once the 37s call left the confirm path, the common case is sub-second (nothing to stream) — this only helps the rare early-confirm/straggler case. **Gate on measurement:** build only if Phase-D instrumentation shows people confirm before the walk finishes often enough to matter. Alternative for the "assembles before your eyes" feel: a client-side staggered reveal of the already-complete list (pure animation). |
| ✅ **SHIPPED (S30)** — [BUG-004] Instrument early-confirm frequency | Session 29 (2026-07-21), SHIPPED Session 30 (2026-07-21) | `grocery-generate.ts` logs one line per confirm: `stragglers` (recipes unready at confirm = the early-confirm signal), `normalizeMisses`, `items`, `confirmMs`. This is the metric that gates #2 section-streaming. Real-model before/after captured in the S30 eval (~27–37s batch → 0 normalize calls at confirm). Read the logs over real usage to decide #2. |
| ✅ **SHIPPED (S31)** — [BUG-004 follow-up] Split `grocery-generate.ts` (313 > 300-line rule) | Session 30 (2026-07-21), SHIPPED Session 31 (2026-07-22) | Extracted `collectSourcedLines` + `sweepStragglers` + `soloFallback` into `grocery-collect.ts` (re-export-preserving, zero caller churn); `generateGroceryList` stays the orchestration. Same session also split `aggregate.ts` (itself 312 > 300) → `quantity-parse.ts`. Both touched files now < 300. |
| **[BUG-004 follow-up] GR-L2 E2E: drive the full straggler transition** | Session 30 (2026-07-21) | GR-L2 currently seeds a list already in `hydrating` and asserts only the "Finishing N recipes…" label — it doesn't drive the real pending→claim→sweepStragglers→residual-normalize→ready flow, so a regression in that transition wouldn't fail E2E (the unit layer does cover residual-normalize). Strengthen it by seeding `pending` with unready slots + a slowed hydration ([E2E:SLOW=…] in a slot title) so the hint shows *then* the list lands. Deferred (timing-sensitive; risk of flakiness) — do carefully. Found by the S30 code review. |
| **Manual recipe entry ("Add manually")** | Session 27 (2026-07-21) | The chosen Recipes design's ＋ menu listed "Generate / Import URL / **Add manually**", but no hand-entry flow exists and it was out of 1D scope, so the ＋ menu ships with the two existing entry points only. Add a manual recipe form (title/ingredients/steps/time/servings → a `manual` `sourceType` recipe) as a later feature. Low urgency (Generate + Import cover most creation). |
| **[taste-watch] Recipes double bottom-bar density** | Session 27 (2026-07-21) | The chosen design puts a floating search/＋ toolbar just above the app tab bar. Built faithfully; on a 430px phone that's two stacked bars. Flagged for Griffin's on-device taste pass — if it reads heavy, options: move search to a sticky top bar, merge the ＋ into the tab bar, or hide the toolbar on scroll-down. Not a bug; a taste call. |
| **[1F] Visual refresh: bring Plan (and Recipes) up to the Groceries fidelity bar** | Session 25 (2026-07-21) | Griffin's instinct while building Groceries: now that we've built the new design in the grocery tab, should it carry to other tabs? **Clarified:** the Groceries design isn't a divergent *design language* — it inherits the same system (tokens, glass rows, eyebrow headers, tab bar). But it IS the highest-fidelity surface built so far (imported straight from Claude Design), and Plan predates that bar. So the real work is a **visual-polish pass on Plan** (spacing, eyebrow headers, progress/affordance styling) to match the current fidelity — NOT a re-architecture (Slice C already proved the architecture is shared). Recipes gets reorganized in Slice D and You-tab is built fresh in 1E, so **Plan is really the only tab needing a dedicated refresh.** Slot for **1F (polish/QA)**; pairs with the wrap-time `/visual-qa`. Decided this is out of Slice C scope (2026-07-21). **UPDATE (S34): superseded/absorbed by the new Phase 1E.5** (full Plan all-states Claude Design buildout, which now precedes 1F) — the buildout replaces this polish-only framing; 1F then polishes on top of 1E.5's output. |
| **[1F] Ship R1 as an installable PWA** | 2026-07-24 (platform-strategy discussion) | Add a manifest + service worker + offline shell + home-screen icon set + install prompt so the existing phone-form-factor web app installs to Griffin's + his wife's home screens and launches full-screen for the 2-week validation. Folded into **1F**, rides with the design-system pass. **Native iOS/Android held** — full UI rewrite, not incremental; revisit only on a real capability (push/camera), validation, or distribution trigger. Decision + rationale + native trigger in `docs/decisions.md` (2026-07-24). |
| Expanded-card structural action model (move day / servings / cook now / grocery) | Session 18 (2026-07-10) | Griffin: the expanded sheet's "What would you like to do?" is too narrow — it only offers recipe-modify chips + a generic swap, but the real jobs are also **cook this now**, **move it to another day**, **cook it for more people**, **add to grocery list**. The Figma State-5 brief (docs/design/brief-plan-states.md) specced exactly these as structural actions alongside the AI-generated chips. Needs a product/design decision: which actions are structural (always present, deterministic UI) vs AI-generated (contextual chips), and what's buildable now vs gated (grocery action needs 1D; cook-now needs Cook Mode). Discussed S18, deliberately not built — candidate for late-1C or a 1C follow-on. |
| Move-a-meal-to-another-day flow | Session 18 (2026-07-10) | Subset of the action-model item but its own build: "Move to another day" → day pills (per State-5 brief), possibly drag-and-drop on the week list later. Griffin explicitly deferred ("don't know if we want to deal with this now"). Data model supports it (slots keyed by date; modify already replaces by dayOffset) — the work is UX + a targeted non-AI mutation (a move shouldn't cost an LLM round-trip). |
| Plan-generation variety miss — 7× "Grilled ___ Salad" in one week | Session 18 (2026-07-10) | Griffin's live plan: every one of 7 meals was a grilled salad. The prompt already says "build variety — don't repeat protein or cuisine back-to-back" and the model blew through it (likely anchored on a grill/salad-ish request or memory). Undercuts the "AI proposals are good" bet harder than chip phrasing. Levers: strengthen the variety rule (vary the dish FORM — salad/pasta/stir-fry/roast — not just protein), few-shot a good week, or eval a stronger model for plan-generate. Pairs with "tune recipe generation quality." |
| ✅ **SHIPPED (S17)** — Dev-only debug HUD (copyable state blob, hotkey-toggled) | Session 16 (2026-07-08), SHIPPED Session 17 (2026-07-09) | Shipped: `useDebugPanel(section, getter)` registry + `DebugHud` mounted in the app shell; toggle Cmd/Ctrl+Shift+D or 🐛; Copy → JSON snapshot. Plan tab publishes derivedState/planId/status/slots/pending/changedDates/ack/error + todayUTC-vs-local. Gated dev / `NEXT_PUBLIC_DEBUG_HUD` / `localStorage debug-hud=1` (runtime flag lets Griffin flip it on his phone without a rebuild); off by default = prod-safe. New surface = one `useDebugPanel()` call. |
| Extend E2E coverage to Recipes + ~~Groceries~~ tabs | Session 17 (2026-07-09); Groceries done S25 | **Groceries: ✅ SHIPPED (S25)** — grocery seed states + `seedGroceryState` + GR1–GR7 specs. **Recipes still open.** The harness infra (auth bypass, seed client, AI-mock seam, config, HUD) is generic — only per-tab pieces are unwritten. Recipes needs: (1) AI-mock fixtures for recipe-generate/recipe-modify/parse-recipe-url (recipe-generate fixture already exists from Slice A), (2) a seed-state builder for recipes, (3) a test-plan catalog + specs, (4) selectors/testids. Do it when actively building on Recipes (Slice D touches the Recipes tab). |
| API consistency: recipe.get returns null vs NOT_FOUND elsewhere | Session 14 (2026-07-06) | `recipe.get` returns `null` for a missing/foreign recipe while `favorite`/`delete`/`confirm` throw NOT_FOUND. Surfaced while writing router tests. Harmless today (UI handles null), but pick one convention and align before more procedures copy either pattern. Small, do during 1D touch of the recipe router. |
| ✅ **SHIPPED (S16)** — "Something is happening" affordance for all AI mutations (MACRO) | Session 12 (2026-05-29), expanded Session 15 (2026-07-06), SHIPPED Session 16 (2026-07-08) | The biggest UX gap in the Plan tab. When any AI modify fires, `handleModify` closes the sheet and the mutation runs 2-5s with **zero in-context feedback** — `modifyMutation.isPending` is only surfaced inside the sheets, so once they close the main screen is idle, then the change silently appears (Griffin S15: "if you're not paying attention you might not even notice"). Two parts. (1) **Immediate working-state on the thing you touched.** The tapped element should react instantly: card chip → chip becomes a spinner / card enters a loading state; expanded-sheet action, Talk-to-Chef send, single-day modify all likewise. (2) **Contextual progress that lives where the user is looking, not a top-of-page toast** (Griffin: "something pops up at the top where I might not even be scrolled to"). Prefer in-place on the affected card; make it contextual to the change ("Adding Sunday's dinner…", "Making it tofu…"). Options to design: card-anchored spinner/skeleton, in-place pill spinner, bottom-anchored toast as secondary confirm-on-done. **S15 concrete finding (Test 4):** the in-sheet "Reworking your plan…" text is effectively unreachable on the modify path — `handleModify` calls `setChatOpen(false)`/`setExpandedOpen(false)` BEFORE the mutation resolves, so the sheet is gone before the pending text can render. Meanwhile the success ack is a top-of-page toast the user can't see when scrolled down (Griffin: "I don't see the top of the screen when I'm scrolled down"). Net: today there is NO reachable pending state anywhere for a modify. The fix must put pending state somewhere persistent and scroll-independent (in-place on the card, or a fixed bottom-anchored element), not inside a sheet we immediately close. **Data constraint for the designer/build:** scoped modifies (card chip, meal-scoped chat) know the target day/meal up front, so in-place works; general Talk-to-Chef doesn't know which day changes until the AI responds, so it needs a general progress affordance until the result lands. Applies to ALL modify paths. **Cross-cutting → consult ux-design-critic before building; this sets the app-wide pattern.** |
| ✅ **SHIPPED (S18)** — Meal chips read as bare adjectives, not tappable actions | Session 15 (2026-07-06), confirmed on fresh generation + prompt hardened Session 18 (2026-07-10) | Session 18 answered the open question: Griffin's live mid-week plan (fresh July generation) still had "plant-based" / "light" / "iron-rich" chips — gpt-4.1-mini drifts to attributes despite imperative examples. **Deliberate prompt change shipped** (chef-system.ts): chips must be verb-first imperative ACTIONS; bare attributes/nutrition labels explicitly banned with wrong-examples; "never offer a quality the dish already has" (a light salad doesn't get "Make it lighter"); modify-prompt got the same chip rule + a title guard (never bolt request wording onto the title — the "Iron-Rich Grilled Steak" failure). Prompt tests pin all three rules. Caveat: AI output quality verifies by fresh generations over time, not E2E (harness uses fixtures) — if drift persists, next lever is few-shot examples or a stronger model for plan tasks. |
| ✅ **SHIPPED (S16)** — No regenerate / "new plan" entry point once a plan exists (V1 BLOCKER) | Session 15 (2026-07-06), SHIPPED Session 16 (2026-07-08): end-of-list "Start over →"/"Plan a new week →" → re-prompt via intent screen; replace-on-generate; unblocks Test 8 | Test 8: discovered the Plan tab has no way to start a new plan once one exists. `NoPlanState` (the generate UI) only renders when `plan.current` is null; after that you only ever see PlanReview or PlanMidweek, neither of which offers regenerate/new-week. The backend stream route can generate, but there's no UI trigger. Breaks the weekly ritual (the north star): after week 1 the plan's days elapse and there's no forward path — you're stuck on a past plan (see all-past item below). Needs a design + build decision: where does "plan next week" live, and does a new generation replace the current plan (one-active-plan rule) or archive it? This is the actual content of Test 8, which cannot run until the entry point exists. Treat as a V1 must-fix, not polish. |
| ✅ **RESOLVED (S16)** — Confirmed plan entirely in the past renders a nonsensical mid-week view | Session 15 (2026-07-06), RESOLVED Session 16 (2026-07-08): `isPlanElapsed` gates a "week wrapped" state. (Timezone off-by-one in `timeframeOf` unchanged — still worth a look.) | Surfaced in Test 6 with the stale May-30 test plan. When a confirmed plan's days are ALL in the past, `isConfirmed && hasPast` flips it to PlanMidweek with every day under "EARLIER THIS WEEK" and an "Anything to adjust for the rest of the week?" prompt — meaningless for an elapsed week. There's no "this plan is over → start a new one" state. Related to the regenerate-entry-point blocker above; likely resolved together (an elapsed plan should invite a fresh week rather than present as current). Also watch: slot dates store as timestamps at UTC-midnight (displayed as prior-day 8pm Eastern) — verify the past/today/future boundary logic in plan-helpers isn't off-by-one across timezones during Test 7. |
| ✅ **SHIPPED (S16)** — Drawer dismissal affordances (X button + click-outside-to-close) | Session 15 (2026-07-06), SHIPPED Session 16 (2026-07-08): X moved into shared `DrawerContent` + focus order fixed; click-outside via a body-safe scrim (background-scroll-while-open traded away). ⚠️ click-outside not click-tested yet | Test 3R: Griffin flagged it's not obvious how to close a drawer. Today's only close paths are the subtle drag-handle bar (non-obvious with a mouse) and Escape. Two asks. (1) **Visible X close button** in the sheet header — LOW RISK, additive, `DrawerClose` primitive already exists; recommend building. Applies to both ExpandedMealSheet and TalkToChefSheet. (2) **Click background/outside to close** — NOT a free add. Outside-click dismissal is modal behavior; both sheets are deliberately `modal={false}` to fix the Test-3 two-drawer pointer-events lockup AND to allow background scroll (Griffin approved the scroll). Re-enabling outside-click risks reintroducing the lockup and killing background scroll. Needs a carefully-tested approach (possibly a custom lightweight overlay that closes on click without toggling body pointer-events), validated against the two-drawer stack. Design-pass item, not a bolt-on. **S15 review follow-ups (from the internal review of the shipped X):** (a) the X `DrawerClose` (icon + ~180-char className) is copy-pasted identically into both sheets — move it into the shared `DrawerContent` (shadcn's dialog does this) so new drawers inherit it; (b) the X is the first focusable child in DOM order, so keyboard/AT users land on "Close" before the sheet's heading — consider ordering/autofocus so the heading is reached first. Fold both into the drawer design pass. |
| Talk-to-Chef pills should auto-send on tap | Session 15 (2026-07-06) | Currently tapping a suggestion pill only fills the textarea (`setText(s)`); user must then hit send. Griffin wants a pill tap to submit immediately — "it's like clicking the submit button," since a pill is a complete self-contained instruction. Tradeoff: loses the ability to edit/combine pills before sending (minor for V1). Pairs with the affordance item above — on auto-send the working-state must show immediately. Recommend: pills fire on tap, textarea stays for freeform. |
| ~~Card touch target too small — only text opens the sheet~~ FIXED Session 15 | Session 15 (2026-07-06) | Test 3R: Griffin couldn't reliably open cards — tapping the top-right/padding did nothing, only tapping near the text worked (~10s of dead taps). Cause: only the text block was wrapped in the tap `<button>`; padding + chip row were dead zones. **Fixed** — whole card is now the tap target (`div[role=button]` + keyboard handler), chips `stopPropagation` to keep their own action. Logged as resolved, not open. |
| Visual polish: sticky confirm bar feels awkward against the tab bar | Session 12 (2026-05-29) | Griffin flagged during Test 1 that the sticky "X dinners · Looks good →" bar that appears when the hero scrolls off looks strange floating above the bottom tab bar. Functional pass, visual polish. Likely fixes: tighter integration with the tab bar (one combined surface), or a different reveal pattern (e.g., expand the tab bar instead of a separate floating pill). Capture for V1 polish pass. |
| Calendar-week-aligned planning ("next week starts Sunday") | Session 12 (2026-05-29) | V1 model is rolling-7-from-today (see decisions.md). Some users mentally plan in terms of calendar weeks ("what are we eating next week, Sun-Sat"). Consider an opt-in "next-week" mode where mid-week generation produces a plan that starts the upcoming Sunday and the current week stays untouched. Real mental model surfaced during Session 12 scoping — kept for post-V1 consideration. |
| User-selectable start day for the plan | Session 12 (2026-05-29) | Let the user pick when the plan begins instead of always "today." E.g., generate on Thursday, but explicitly tell the chef "starting Monday." Companion to calendar-week-aligned planning above. Deferred to post-V1. |
| User-selectable plan length (variable days) | Session 12 (2026-05-29) | Plan length is fixed at 7 days in V1 (decisions.md). Allow the user to say "plan 3 dinners," "plan through next Wednesday," or "plan the weekend." Combines with start-day above. Two routes: explicit config UI vs. infer from intent in the prompt. |
| Auto-infer plan duration and start from user intent | Session 12 (2026-05-29) | Rather than asking the user to configure days, let the chef pick duration/start from the request — "plan a dinner party Saturday" → 1 meal Saturday; "plan our week" → ~5 dinners starting today; "we're traveling Thursday-Sunday" → meals for Mon-Wed only. Combines length + start + skips. Harder to do well but matches the AI-first interaction model. |
| Concurrent plans / plan history (next-week-while-this-week) | Session 12 (2026-05-29) | V1 enforces one active plan per household. Some users want to draft next week while this week is still live, or look back at past weeks. Requires revisiting the data model (current `plan.current` returns a single plan; "active plan" concept would need explicit selection). Deferred. |
| Cost-effective food imagery for cards | Session 12 (2026-05-28) | Plan/recipe cards ship text-forward in V1, but the Figma mocks look notably better with food photos. Griffin wants a cost-effective way to support images later (NOT per-meal AI image generation — too expensive). Explore: stock food API matching, borrowing imported-recipe source images, a small curated image set keyed by cuisine/dish-type, or cheaper image models. Resolve before we'd consider it shippable. |
| Tune recipe generation quality | Session 11 (2026-05-27) | Generation works (gpt-4.1-mini) but output could be tuned — prompt refinement, output style, ingredient grouping, defaults. Griffin flagged "we'll want to tune this a bit." Phase 1B polish or later. |
| Nutrition data and macro tracking | Session 2 (2026-03-29) | Add nutritional info and macro tracking. Related to V3 nutrition engine but may warrant earlier lightweight version. |
| Free-form list entry (type anything) alongside structured catalog | Session 2 (2026-03-29) | Dual mode: structured ingredient picker AND free-text "just jot it down." Tension between normalization and speed. Needs design exploration. |
| Non-food household items on grocery list | Session 2 (2026-03-29) | This is your full store list — paper towels, cleaning supplies, etc. Not just recipe ingredients. |
| Auto-generated refinement pills / suggestion chips | Session 2 (2026-03-29) | Dynamic pills that narrow results: "healthy" → "dinner" → "grill" → "fast" → "chicken." Continuously update based on context. |
| AI-powered ingredient substitution (not a static carousel) | Session 2 (2026-03-29) | Context-aware swaps via AI rather than a fixed "related items" list. |
| "Capture most intent with AI" — AI-first preferences management | Session 2 (2026-03-29) | Instead of static settings UIs, let users say/type what they want and it happens. Preferences recalled and edited through AI. Potential core tenet. |
| Show prompt examples / discovery prompts | Session 2 (2026-03-29) | Show users how to ask for things: "I want to grill this week, let's jam." AI as a discovery partner. |
| Custom store layout capture via AI | Session 2 (2026-03-29) | "Tell me how your store is laid out" or learn from check-off order over time. |
| Learn preferred brands from merchant orders | Session 2 (2026-03-29) | After ordering, remember brand preferences (e.g., specific milk brand/type). Builds intelligence passively. |
| Handwritten list scanning | Session 2 (2026-03-29) | Scan a handwritten list and integrate into the system. Augments meal planning. |
| Flexible occasion-based planning (dinner parties, hosting, potlucks) | Session 2 (2026-03-29) | Not just weekly meal prep — handle "I'm having 8 people over Saturday, help me plan the full meal." Inspiration → recipes → list → cooking. |
| Learning user behavior passively (what they buy, skip, repeat) | Session 2 (2026-03-29) | System gets smarter over time without cumbersome tracking. Observe patterns from lists, check-offs, reorders. |
| Memory system — persistent user context | Session 2 (2026-03-29) | Core feature. Track preferences, brand choices, recipe opinions across sessions. Confirm to user when something is saved. Infrastructure for personalization. |
| AI-guided onboarding ("AI interview" format) | Session 2 (2026-03-29) | Conversational onboarding instead of static forms. Zillow data showed higher conversion + more data points captured. Guide but don't restrict. |
| Dictation/voice-first input emphasis | Session 2 (2026-03-29) | Emphasize dictation so users don't have to type. Not AI voice mode — just speech-to-text input. Forward-facing pattern. Further validated by Cooklist walkthrough (Session 5). |
| Dynamic UI elements within chat (not plain text chat) | Session 2 (2026-03-29) | Chat with rich inline elements: recipe cards, plan previews, suggestion chips, illustrations, motion. Not a ChatGPT clone. |
| Proactive context-aware suggestions | Session 2 (2026-03-29) | System maintains state and proactively suggests: "You only planned 2 meals — want to add more?" "You liked X last week — bring it back?" |
| User education on AI capabilities | Session 2 (2026-03-29) | People need to learn how dynamic the system is. Show examples, prompt templates, progressive disclosure of what's possible. |
| "AI generates the UI" — dynamic personalized proposals | Session 3 (2026-03-30) | Core interaction model. System presents pre-populated, opinionated proposals (meal plan, recipes, list). User reacts/tweaks/confirms. Gets faster over time. |
| Weekly check-in prompt ("How were your recipes?") | Session 3 (2026-03-30) | Lightweight start-of-week explicit feedback moment. Voice dictation or quick-tap options. Skippable. Framed as personal chef checking in, not a survey. Should sunset once system has enough data. |
| Voice dictation for feedback and modifications | Session 3 (2026-03-30) | Voice-first for check-ins, recipe modifications, and free-form input. Reduce typing friction. |
| "Personal chef" interaction framing | Session 3 (2026-03-30) | The system's tone and behavior should feel like a knowledgeable personal chef — not a chatbot, not a tool. Checks in naturally, remembers, adjusts. |
| Ingredient reuse optimization in meal planning | Session 5 (2026-04-05) | Plan meals that share ingredients (tortillas, eggs) to reduce grocery cost. "Mix and match" optimization. Observed in Cooklist. |
| Multi-provider authentication (Google, OTP) | Session 5 (2026-04-05) | Login should support Google SSO, one-time passcode, and other major providers. Research which providers matter most. |
| "Scan your fridge" AI pantry import | Session 5 (2026-04-05) | Take a photo of fridge, AI identifies contents and populates pantry. Saw in Cooklist. |
| Ingredient detail pages (related recipes + products) | Session 5 (2026-04-05) | Click an ingredient to see recipes using it and related products. Cross-referencing entity. Interesting concept from Cooklist. |
| In-app guided tour with screen highlights | Session 5 (2026-04-05) | Overlay-based progressive feature discovery. Cooklist does this — Griffin likes the pattern even if their execution is rough. |
| Pre-authenticated store accounts (setup, not checkout) | Session 5 (2026-04-05) | Link retailer accounts during onboarding/profile setup so checkout is frictionless. Avoid web view login during shopping flow. |
| Grocery spend tracking / cost analysis | Session 5 (2026-04-05) | Track grocery spending by category, retailer, month. Interesting for budget-conscious users. Saw in Cooklist. |
| App review prompt timing research | Session 5 (2026-04-05) | Research best practices on when to prompt for app store reviews. Too early = annoying. Needs data-driven timing. |
| Macro tracking extension (future) | Session 5 (2026-04-05) | If we know every meal, we're close to being a food tracker / macro counter. Don't build now (niche risk), but the data will be there. Deferred. |
| Design sophistication as competitive moat | Session 5 (2026-04-05) | The entire competitive set looks amateurish/cheesy/childish. Modern, sophisticated, clean design is a massive differentiator. Not just Griffin's preference — the bar is genuinely low. |

---

## Slotted into V1

| Idea | Source | Notes |
|------|--------|-------|
| Recipe URL import with AI extraction | Griffin brain dump + competitor research | Core V1 feature. Competitors weak here (Samsung Food fails on many sites). |
| AI recipe generation from constraints | Griffin brain dump | Core V1 feature. |
| AI recipe modification with version history | Griffin brain dump | Core V1 feature. Key differentiator — no competitor does versioning well. |
| Weekly meal planner with calendar | Griffin brain dump + competitor research | Core V1 feature. "10-min weekly ritual" north star. |
| AI-assisted "fill my week" | Griffin brain dump | V1 feature. |
| Auto-generated grocery list from meal plan | Griffin brain dump + competitor research | Core V1 feature. Biggest retention lever per research. |
| Intelligent ingredient merging/dedup | Competitor research (NYT Cooking complaints) | Core V1. "Never make users do math." |
| Staples/recurring items list | Griffin brain dump | V1 feature. |
| Grocery list export (clipboard/share) | Griffin brain dump | V1 feature. |
| Household sharing (dual account ownership) | Griffin brain dump, moved from V1.5 (2026-03-29) | Moved to V1 — deep infra implications (auth, data scoping, real-time sync). At least 2-person sharing. |
| Dietary framework selection (preferences) | Griffin brain dump | V1 onboarding. |
| "No list" for foods to avoid | Griffin brain dump | V1 feature. |
| Contextual AI (inline, not chat tab) | UX designer recommendation (Session 1) | V1 interaction model baseline. |

## Slotted into V1.5

| Idea | Source | Notes |
|------|--------|-------|
| Progressive pantry (binary have/don't have) | Griffin brain dump + competitor research | Light mode only. Research: pantry setup friction kills apps. |
| "What can I make?" from pantry | Griffin brain dump | Depends on pantry. |
| Basic expiration awareness | Griffin brain dump | Static shelf-life table, not AI. |

## Slotted into V2

| Idea | Source | Notes |
|------|--------|-------|
| Grocery ordering — **Instacart handoff** (`create_shopping_list_page`) — 🔴 **BLOCKED ON INSTACART** | Technical research (S1), **re-verified S44 2026-07-30** | **The target, and unreachable.** Applications closed, no waitlist, no date. Deep links are obsolete either way. ~98% of US households in ONE integration, no OAuth, no account linking, no cart state — which is why it stays the goal rather than being replaced. **Standing watch in whats-next.md.** No side door: affiliate/Tastemakers/Chicory/Northfork all fail to substitute (see technical-research.md). |
| Grocery ordering — **Kroger Cart API** (the hedge) | Technical research (S1), **re-framed S44 2026-07-30** | **The only open grocery API in the US** — not the best, the only. Walmart stopped issuing affiliate API keys; Costco/Albertsons/Publix/Target have no public cart API. ~10% national share, ~2,700+ stores, ~35 states, growing (Giant Eagle, 2026-07-01). **Costs:** per-user OAuth + token refresh + re-opens account-linking. **Build only if ordering turns urgent before Instacart reopens.** |
| ⚠️ Anti-idea: integrate grocery retailers one at a time | S44 (2026-07-30) | **Logged so nobody re-proposes it.** Aggregators are the TAM; retailers are not. Top 5 US chains ≈ 53% share and **four of the five are closed to developers**. You would need all of them to approach what one aggregator gives you. Don't chase this. |
| DoorDash / Uber Eats grocery — do they expose a consumer cart API? | S44 (2026-07-30) | **UNVERIFIED, 20-minute check when V2 opens.** Both run grocery now and both have developer platforms, but those platforms look aimed at merchants + delivery logistics rather than consumer cart-building. Probably the wrong shape. Worth confirming rather than assuming, given how few doors are open. |
| Instacart MCP server as the chef's tool | S44 (2026-07-30) | Instacart ships an MCP server. Since the app is AI-native, the chef could construct the shoppable page directly rather than us hand-rolling the call. Not for 1F (ship the plain server-side call first); revisit once the integration is live and approved. |
| Photo/screenshot recipe import (Claude Vision) | Griffin brain dump | Depends on vision model quality. |
| Instagram URL recipe extraction | Griffin brain dump | AI-powered extraction from post content. |
| Share-to target for mobile web | Session 1 planning | Let users share from Instagram/Safari directly. |
| Freshness-aware meal sequencing | Griffin brain dump | Perishables early in week, stable meals later. |
| Store layout / aisle mapping | Griffin brain dump + competitor research | User-defined or templates. Plan to Eat praised for this. |
| Schedule awareness (busy nights) | Griffin brain dump | Mark "busy" days, AI adjusts plan complexity. |

## Slotted into V3

| Idea | Source | Notes |
|------|--------|-------|
| Per-recipe nutrition estimates | Griffin brain dump | AI + USDA FoodData Central API. |
| Weekly nutrition summary | Session 1 planning | Depends on nutrition engine. |
| Diet adherence scoring with explanations | Griffin brain dump | "Why flagged" + "what instead." |
| Food warnings on grocery list items | Griffin brain dump | Flag conflicts with dietary preferences. |
| Smart reordering (recurring purchase detection) | Session 1 planning | Detect patterns from grocery list history. |
| Restaurant guidance | Griffin brain dump | AI suggests menu options based on diet. |
| Product research assistant | Griffin brain dump | "Find me a good protein powder." |
| Barcode scanning for pantry | Griffin brain dump | Advanced pantry mode. |
| Receipt photo scanning for pantry | Griffin brain dump | AI extraction from receipt photos. |
| Rough quantity tracking (full/half/almost out) | Session 1 planning | Step up from binary pantry. |

## Slotted into V4

| Idea | Source | Notes |
|------|--------|-------|
| iOS native app (React Native/Expo) | Session 1 planning | Consumes same tRPC API. |
| Push notifications | Session 1 planning | Expiration alerts, "time to plan" reminders. |
| Share extension (import from any app) | Session 1 planning | Critical for recipe capture on mobile. |
| Offline support with local cache | Session 1 planning | SQLite + sync-on-reconnect. |
| Home screen widgets (meal plan, grocery list) | Session 1 planning | iOS/Android. **This row is the *display* widget (read your plan / read your list).** The *action* widget Griffin asked for in S44 (`＋ Add to list` + mic, pressed not read) is a distinct feature — see Incoming (S44) "Zero-app add-to-list", Door 2. Both are native triggers per decisions.md 2026-07-13. |

## Unphased (Good ideas, not yet assigned)

| Idea | Source | Notes |
|------|--------|-------|
| Cook Mode (step-by-step with timers, voice) | Session 1 brainstorm | Addresses blind spot: actual cooking experience. |
| Leftover Intelligence ("chicken Monday → chicken salad Wednesday") | Session 1 brainstorm | Reduces waste, great AI use case. |
| Seasonal/Local Awareness | Session 1 brainstorm | In-season = fresher, cheaper, tastier. |
| Batch Prep Coaching ("90-min Sunday prep plan") | Session 1 brainstorm | The HOW of meal prep, not just WHAT. |
| Weekly Review Ritual (what did you actually make? thumbs up/down) | Session 1 brainstorm | Feeds recommendation engine. Critical for AI improvement. |
| Cost Estimation (grocery list price estimates) | Session 1 brainstorm | Budget-conscious users. Research: cost is a real driver. |
| Family Member Profiles (per-person preferences) | Session 1 brainstorm | Conflict navigation ("partner dairy-free, you love cheese"). |
| "Quick Win" Suggestions (tonight's dinner from pantry + expiring) | Session 1 brainstorm | The "staring at fridge" moment. |
| Cooking Skill Progression (track techniques, push comfort zone) | Session 1 brainstorm | Light gamification with purpose. |
| Collaborative Meal Planning (dinner parties, potlucks) | Session 1 brainstorm | "I'm bringing main, you bring sides." |
| Multimodal food evaluation (photo → dietary assessment) | Griffin brain dump | Take photo, AI evaluates against diet. |
| Baby mode onboarding (chat + fixed UI combo) | Griffin brain dump | Dynamic onboarding approach. |
| Metabolic health food lookup ("is this food good for me?") | Griffin brain dump | Standalone utility within the app. |
| Help finding healthier restaurants | Griffin brain dump | Extension of restaurant guidance. |

## Explicitly Deprioritized

| Idea | Reason | Date |
|------|--------|------|
| LLM fine-tuning / custom model | Claude/GPT structured output handles recipe tasks well. Revisit only if quality insufficient. | 2026-03-28 |
| Full quantitative pantry (gram-level) | Too much friction. Binary or rough estimates only. Research validates this. | 2026-03-28 |
| Loyalty card API integration | Brittle, retailer-specific. Cooklist's experience shows trust damage when it fails. | 2026-03-28 |
