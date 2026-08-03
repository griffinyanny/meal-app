# Observability — event taxonomy

**Created:** 2026-08-03 (Session 63, 1F Workstream D3) · **Status:** design, pre-wiring

> **⚠️ Why this document exists at all.** Six documents named *"the event taxonomy from S9"* as an
> available input to this work — [scope-v1.md:133](scope-v1.md#L133), [scope-1F.md:1062](scope-1F.md#L1062),
> `whats-next.md` ×4, [idea-backlog.md:405](idea-backlog.md#L405), and two kickoff prompts. **It does not
> exist.** Its only source is one changelog line ([changelog.md:3545](changelog.md#L3545) — *"event taxonomy
> defined (30+ events across 8 categories)"*), and the artifact lived in
> `~/.claude/plans/resume-meal-app-let-s-partitioned-starfish.md`, which
> [plans/README.md:10](plans/README.md#L10) records as **LOST** since S18 — never committed, deleted,
> unrecoverable.
>
> The plan's *phase-skeleton* half was consciously rescued into `scope-v1.md` at S19. Its *taxonomy* half
> was not, and nobody noticed for 44 sessions because nothing needed it until now. **Fifth instance of the
> project's recurring pattern:** a claim written once and repeated until it read as established.
>
> ⚠️ **The related claim in the same S9 decision row is also false in effect.** *"Analytics: PostHog
> (decided, installed later). Vendor abstraction layer built in Phase 1."* The layer exists as
> [src/lib/analytics.ts](../src/lib/analytics.ts) — **15 lines of dev-only `console.log` with zero call
> sites.** The file's existence is what made the claim read true. This taxonomy is designed from the build,
> not reconstructed from either sentence.

---

## What this is for

Two jobs, and they are not the same job.

1. **The DoD measurement.** [scope-v1.md](scope-v1.md) requires *"time-to-list measured < 10 minutes on a
   real week."* That is a number, not a feeling, and it needs a start event and an end event that can be
   correlated across a page reload, a confirm, and possibly an app kill.
2. **The debugging substrate for the validation weeks** (Griffin, S52). Without it he reports a bug from
   memory and Claude guesses. With it, the error and the path that produced it are both visible.

**Scope: broad (~34 events, 8 categories)** — Griffin's call, S63, against a lean recommendation. The
reason it is the right call at two users: the interaction events are not growth metrics here, they answer
*"does the feature I built ever get touched"*, which is a real MVP question and the only two weeks of real
usage R1 will produce.

---

## Three design rules

### 1. The ritual id — how time-to-list becomes a query

The north-star clock spans four surfaces, a confirm, at least one background job, and possibly a relaunch:

```
intent submitted  →  stream  →  review  →  confirm  →  list pending  →  hydrate → normalize
   → aggregate  →  generationStatus: "ready"
POST /api/plan/stream        plan.confirm            grocery.generate
```

There is **no server-side id available at the start** — `persistPlan` runs in the stream's `onComplete`, so
the plan does not exist when the clock starts. So the correlation key is **client-minted**:

- A `ritual_id` (uuid) is minted at intent-submit and written to **`localStorage`**, not `sessionStorage`.
  ⚠️ The store matters: an installed PWA gets evicted by iOS over a long shop, and the app-kill replay is a
  real scenario this project already tests for. `sessionStorage` would lose the clock exactly in the case
  worth measuring.
- Every event in categories **A–C** carries it.
- It is **cleared at `list_ready`**, and a stale one older than 24h is reported as `ritual_abandoned` on
  next launch, then cleared.

`time_to_list_ms` is then `list_ready.ts − ritual_started.ts`, grouped by `ritual_id`. One query.

⚠️ **`ritual_abandoned` is not optional garnish.** Without it the "< 10 minutes" claim is computed only over
rituals that *finished*, which is survivor bias with a number attached. The DoD deserves the denominator.

### 2. Client events and server events, split on who actually knows

**Interaction events fire client-side.** They join to session replay by `distinct_id` and session for free,
which is the entire reason replay is in D.

**AI outcome events fire server-side**, through the seam that already exists —
[`logAICall`](../src/server/ai/logger.ts) already carries `task`, `model`, `latencyMs`, token counts,
`success` and `error`. No new plumbing; it gains a sink.

⚠️ **This split is BUG-035's lesson, not a preference.** `useObject` only populates `error` for a failed
*request*. The stream route has already returned 200 with an open body by the time a generation can stall,
so a dead stream reaches the client as a body that simply **closes** — `isLoading` goes false, `error`
stays undefined. **The client cannot distinguish a timeout from a stall from a provider error.** Only the
server knows which one it was, so only the server can report the reason.

Server events use `distinct_id` = the Supabase user id, which is the same id the browser SDK identifies
with, so the two streams join.

⚠️ **Serverless flush.** The PostHog Node SDK batches, and a Vercel function can be killed before the batch
goes out. Server events flush via `after()` from `next/server` — the function's own post-response hook —
rather than relying on an interval that may never fire.

### 3. No PII, enforced by the type rather than by discipline

Event properties are **ids, enums, counts, durations and booleans**. Never free text, recipe titles,
grocery item names, memory bodies, dietary answers, children's ages, or email.

This is the same rule [`.claude/rules/ai-pipelines.md`](../.claude/rules/ai-pipelines.md) already applies to
prompts, and it is enforced the way BUG-044 enforced the diet domain: **the event map is a discriminated
union, so a wrong name or a missing property is a compile error, and there is no `string` property
anywhere in it that could accidentally carry content.** Where a length matters, it is bucketed
(`short`/`medium`/`long`), never sent raw.

---

## The taxonomy

Naming: `snake_case`, `noun_verb_past`. Every event below maps to a real seam in the build; the **Fires**
column names it.

### A · The ritual — the DoD measurement (5)

| Event | Properties | Fires |
|---|---|---|
| `ritual_started` | `ritual_id`, `entry` (`intent`\|`regenerate`\|`onboarding_handoff`), `has_request`, `picked_count` | `handleGenerate` in `plan-page-client.tsx` |
| `plan_generated` | `ritual_id`, `meal_count`, `duration_ms`, `picked_count` | `useObject.onFinish`, object defined |
| `plan_confirmed` | `ritual_id`, `meal_count`, `days_covered`, `was_modified` | `plan.confirm` success |
| `list_ready` | `ritual_id`, `item_count`, `section_count`, `generation_ms`, **`time_to_list_ms`** | `grocery.current` observes `generationStatus: "ready"` |
| `ritual_abandoned` | `ritual_id`, `last_step`, `age_ms` | next launch, stale ritual in `localStorage` |

### B · Plan (6)

| Event | Properties | Fires |
|---|---|---|
| `plan_generation_failed` | `ritual_id`, `reason` (`timeout`\|`stream_died`\|`invalid`\|`rate_limited`\|`budget_exhausted`\|`unknown`), `duration_ms` | server (`logAICall`) + `onFinish` with no object |
| `plan_regenerated` | `ritual_id`, `prior_meal_count` | regenerate airlock |
| `plan_modify_requested` | `ritual_id`, `scope` (`week`\|`meal`), `day_offset?` | `use-plan-modify.ts` |
| `plan_modify_resolved` | `ritual_id`, `outcome` (`applied`\|`failed`), `changed_meal_count`, `duration_ms`, `reason?` | `plan.modify` settle |
| `plan_meal_opened` | `ritual_id`, `day_offset`, `slot_type`, `recipe_status` | `use-plan-sheet.ts` |
| `plan_feedback_given` | `feedback`, `day_offset` | `plan.feedback` |

### C · Library into plan (2)

| Event | Properties | Fires |
|---|---|---|
| `picker_opened` | `ritual_id`, `library_size`, `filter` | `plan/picker` |
| `recipe_picked` | `ritual_id`, `pick_count_after`, `source` (`picker`\|`detail_add_to_week`), `removed` | `plan.pick` / `add-to-week.tsx` |

### D · Recipes (5)

| Event | Properties | Fires |
|---|---|---|
| `recipe_created` | `source` (`ai_generate`\|`url_import`), `duration_ms` | `recipe.generate` / `recipe.importUrl` |
| `recipe_create_failed` | `source`, `reason` | same, server-side |
| `recipe_modified` | `duration_ms`, `version_depth` | `recipe.modify` |
| `recipe_favorited` | `is_favorite`, `source_type` | `recipe.favorite` |
| `recipe_library_browsed` | `filter` (`all`\|`favorites`\|`cooked`), `result_count`, `searched` | `recipe-filters.tsx` |

### E · Groceries (8)

| Event | Properties | Fires |
|---|---|---|
| `grocery_generation_failed` | `ritual_id`, `phase` (`hydrating`\|`normalizing`\|`aggregating`), `reason` | `grocery-generate.ts`, server-side |
| `grocery_item_checked` | `checked`, `checked_count`, `total_count`, `offline` | `got-it-zone.tsx` |
| `grocery_item_added` | `source` (`manual`\|`staple`\|`chef`), `category`, `deduped` | `grocery.addItem` |
| `grocery_item_edited` | `field` (`name`\|`quantity`\|`category`) | `grocery-item-mutations` |
| `grocery_item_split` | `source_count` | `splitItem` — the merge-quality signal |
| `grocery_organize_changed` | `mode` (`grouped`\|`manual`) | `organize-toggle.tsx` |
| `grocery_reordered` | `scope` (`sections`\|`items`) | `reorderSections`/`reorderItems` |
| `grocery_exported` | `item_count`, `unchecked_count` | `grocery-export.ts` |

⚠️ `grocery_item_split` is here because ingredient merging was named *"the hard V1 problem"* in
[scope-v1.md:82](scope-v1.md#L82) and signed off on one human eye. A split is the user telling us a merge
was wrong. It is the only ongoing quality signal that exists for it.

### F · Chef conversation (2)

| Event | Properties | Fires |
|---|---|---|
| `chef_talk_submitted` | `surface` (`plan`\|`groceries`\|`you`), `input_mode` (`typed`\|`mic`), `length_bucket` | `talk-to-chef-sheet.tsx` |
| `chef_talk_failed` | `surface`, `reason` | server-side, the three `talk` procedures |

### G · You and memory (3)

| Event | Properties | Fires |
|---|---|---|
| `preference_updated` | `field`, `method` (`direct`\|`chef`) | `user.updatePreferences` |
| `memory_toggled` | `active` | `memory.deactivate`/`reactivate` |
| `memory_captured` | `surface`, `count` | `user.talk` write path |

### H · Onboarding and app lifecycle (5)

| Event | Properties | Fires |
|---|---|---|
| `onboarding_started` | — | `onboarding-flow.tsx` mount |
| `onboarding_completed` | `duration_ms`, `question_count`, `deepened`, `skipped` | `finishOnboarding`/`skipOnboarding` |
| `app_launched` | `display_mode` (`standalone`\|`browser`), `offline` | root client layout |
| `connectivity_changed` | `online`, `offline_duration_ms?` | the offline clause's existing listener |
| `queued_mutations_flushed` | `count`, `failed_count` | the persister's resume path |

⚠️ `app_launched.display_mode` is the only automated evidence that the PWA install actually took — the
two-phone check is manual and unrepeatable, and this is what tells us it is still true in week two.

---

## ⚠️ Wiring status — declared is not captured

**8 of 34 events have a real call site as of S63. The other 26 are designed and
typed but nothing calls them yet.**

This is stated loudly because it is the exact shape of the claim that started this work: a taxonomy named
in six documents as an available input, which nobody had checked. A table of events reads as a working
pipeline. It is not one until something calls it.

**Wired — the whole north-star funnel, end to end:**
`ritual_started` · `plan_generated` · `plan_generation_failed` · `plan_confirmed` · `list_ready` ·
`ritual_abandoned` · `app_launched` · `connectivity_changed`

That set is deliberate rather than arbitrary: it is exactly what the DoD's time-to-list measurement needs,
plus the two lifecycle events that say whether the PWA install held. **Workstream E's gate is satisfied by
this set** — E0's scoping pass needs a taxonomy to specify a payload against, and it now has one.

**Not yet wired:** everything in categories B (except the two above), C, D, E, F, G, and the onboarding
half of H. All mechanical — the typed module exists, so each is a one-line call at a known seam.

**The gap cannot drift silently.** `src/lib/analytics/wiring.test.ts` reads `src/` off disk and fails three
ways: an event claimed wired that nothing calls, an event called that is not claimed, and a remainder count
that no longer matches. ⚠️ It also asserts that the scan **found anything at all** — without that, a broken
scan returns an empty set and every other assertion passes vacuously, which is the "test that could not
fail" this project has now produced three separate ways.

---

## Session replay — the masking posture

**The vendor default is wrong for this app and must be inverted.** PostHog (and FullStory, LogRocket, every
tool in the category) masks *input fields* by default, because in a typical SaaS the sensitive material is
what users type.

**Here it is mostly rendered output:** the chef's memories about the household, the dietary and health
answers from the interview, household composition and children's ages, and the whole grocery list. Masking
inputs by default covers almost none of it.

**So: mask everything, then unmask an explicit allow-list** — nav, buttons, state labels, error copy.
A denylist fails open on exactly the screen we would most regret recording, which is the argument that made
BUG-018's guard an allow-list.

⚠️ **This gets verified by looking at a real recording, not by reading the config.** A masking config that
looks correct and records the grocery list is precisely the false green this project has produced six
distinct ways. The config is the hypothesis; the recording is the measurement.

### ✅ S64 — the recording was measured, and it was leaking (BUG-060)

**Text masking works: zero leaks in text nodes.** The leak was `aria-label`.

⚠️ **`maskTextFn` reaches TEXT NODES ONLY. rrweb records ATTRIBUTES VERBATIM, and the installed build
exposes no attribute hook at all** — measured against `posthog-js/dist/rrweb.d.ts`, whose `recordOptions`
offers `maskTextClass`, `maskTextSelector`, `maskAllInputs`, `maskInputOptions`, `maskInputFn` and
`maskTextFn`, and nothing for attributes. **Nor is there a central place to scrub it:** posthog-js
compresses each snapshot item inside the lazily-loaded recorder bundle, *before* `before_send` runs. **No
configuration could have closed this.**

Leaking through ``aria-label={`Check off ${item.name}`}`` and five siblings: the grocery list, the week's
meal titles, the recipe library, and the user's **dietary constraints**.

⚠️ **The rule that produced it is our own.** `.claude/rules/react-components.md` says *"all interactive
elements need aria labels."* **The accessibility rule and this masking posture were in direct conflict and
nothing in the repo could see it.** Resolved by naming controls from text nodes — the element's own
contents, or `aria-labelledby` at the node that already renders the name, with icon-only verbs in `sr-only`
spans. WCAG 2.5.3 ("Label in Name") prefers that anyway. Enforced by `src/lib/analytics/aria-leak.test.ts`.

⚠️ **AND THE CHECK WAS VACUOUS IN TWO STACKED WAYS BEFORE IT COULD SEE ANY OF IT.** (1) `readBody`
gunzipped only when the URL contained `compression=gzip`, and **the `/s/` request carries no query string at
all** — so 30KB of gzip was searched as text, and searching compressed bytes for "garlic" finds nothing
whether or not it leaked. (2) Even decompressed, the outer `/s/` body is an **envelope**: every large
`$snapshot_data` item carries `data` as a **second, separately gzipped** latin1 string, so **the outer JSON
has never contained one word of page content.** **The generalisable rule: before reading a value out of a
payload, prove the payload is readable.** `assertDecoded` now fails on a mostly-unprintable ingest body, and
a second guard fails if the inner expansion stops expanding.

**Verified: 10 requests, 157,787 bytes inspected, 0 leaks.**

### ⚠️ Analytics cannot be observed in the default test browser, by the vendor's design (BUG-059)

posthog-js's `capture()` opens with `!config.opt_out_useragent_filter && this._is_bot()` and **skips the
send entirely** when true. `_is_bot()` fires on a blocklisted UA, on blocklisted `userAgentData.brands`, or
on **`navigator.webdriver`** — and headless Playwright trips **two of the three independently**
(`"headlesschrome"` is on PostHog's built-in list). **The gate is in `capture()`, not `init()`**, so remote
config is fetched, the recorder downloads, and nothing errors — and replay dies with analytics because `/s/`
rides `capture("$snapshot")`.

**This is why `masking-check.ts` runs in a context that overrides both signals**, and why its first test is
the unspoofed leg asserting the silence: if posthog-js ever changes its bot policy, that goes red rather
than silently changing what the harness measures. **The production config keeps the bot filter** — it is
correct behaviour for real traffic, and it also keeps Lighthouse and Vercel's screenshot bot out of the DoD
numbers, both of which are on the same list.

**Quota, confirmed at build time rather than assumed** (posthog.com/pricing, fetched 2026-08-03): free tier
is **1M events/mo, 5,000 session recordings/mo, 100k error-tracking exceptions**, no card required. Two
users for two weeks cannot approach any of it.

**Griffin's wife is recorded too, and should be told.** One sentence; it is in D's checklist because the
replay item owes it. ⚠️ **As of S64 this is a BLOCKER, not a courtesy:** `NEXT_PUBLIC_POSTHOG_KEY` is not
set in Vercel Production, so nothing is being recorded yet — and **the env var should not go in until that
conversation has happened.** The order matters and it is the only reason production analytics is still off.

---

## What is deliberately NOT here

- **No revenue/funnel/growth events.** There is no pricing surface in R1.
- **No per-tab-switch or per-scroll events.** Replay answers navigation questions better than a counter does.
- **No `$autocapture`.** It is on by default in PostHog and it captures element text — which is the exact
  content the masking posture exists to keep out. **Explicitly disabled**; every event here is deliberate.
- **No client-side AI failure reasons.** See design rule 2 — the client genuinely does not know.
