# What's Next

Last updated: 2026-07-31 (Session 52; 1F Workstream B opened — B1 + B5 code-complete)

## 🔭 STANDING WATCH — Instacart applications (closed as of 2026-07-30). No action, just don't forget.

**Ordering is V2 and R1 ships none of it.** Griffin's call: *"not a critical need, I'd love to get a
polished version of v1 first."* R1's answer stays the **clipboard export shipped in 1D**.

S44 spent a round pulling ordering into R1 and then reverting it, because Instacart's developer
application turned out to be **closed, no waitlist, no reopen date**. Their docs describe a self-serve
dashboard, but that is the flow *after* approval.

**Why this stays visible even though nothing is scheduled:** the TAM research says **one Instacart
integration reaches ~98% of US households**, and every retailer-direct alternative is single-digit share
with a separate build. **Kroger is the only open grocery API in the US** (Walmart stopped issuing
affiliate API keys; Costco/Albertsons/Publix/Target have no public cart API) and it is a ~10% hedge, not
a strategy. So Instacart reopening is the single highest-leverage external event for this feature.

- [ ] **Periodic check, no waitlist to join:** https://company.instacart.com/business/developers — has
      *"We are currently not accepting new applications"* changed? Worth a look at V2 planning, and any
      time ordering comes up.
- [ ] If it reopens: eligibility is 18+, registered business or US/Canada resident, company/contact
      info, dev experience, terms agreement. Then the ~30-40 day review clock becomes real again and the
      pull-forward argument comes back with it.
- 🛒 **Griffin has offered to shop QFC (a Kroger banner) instead of Haggen (Albertsons, no API) for
      testing**, which aligns his store with the only open API if we ever build the Kroger hedge.

Full analysis incl. US market-share table: `technical-research.md` → TAM analysis. Decision:
`decisions.md` (2026-07-30, both entries — the reversal is deliberate and legible).

---

## ▶ NEXT SESSION — **Workstream B is open. B1 + B5 are CLOSED; 7 items remain.**

**S52 answered both of Griffin's taste calls and closed B1 + B5 together**, because they resolve to the
same treatment. **691 unit** (688 + 3 new palette guards) **+ 121 E2E green**, lint + typecheck clean,
`/visual-qa` at **0 blockers / 0 high** on Groceries and Recipes, nothing on a branch.

**Griffin's two calls, both taken as recommended:** the amber Groceries merge markers become a **neutral
inset carrying the count as type**; the cooked/complete check **keeps a hue** (`#9CB86F`) rather than going
neutral.

### The thing worth carrying — fourth session running, and it changed shape again

**S50: the tracker was wrong about what the bug WAS. S51: right about the bug, wrong about the FIX. S52:
the bug had already fixed itself, and the doc had the reason backwards.**

- **The indigo draft pill does not exist.** Spec §12 item 03 and scope-1F both called it *"the last live
  indigo in the product after 1E.7 retired `--primary`."* Retiring `--primary` is exactly what **killed**
  it — the pill is styled `bg-primary/12 …`, and 1E.7 aliased `--primary` → `--spec-action`. Zero indigo
  literals remain in `src/`.
- **The real defect was underneath and is not what was filed.** With indigo gone the pill had become
  **cream** — the *action* hue. §01 says cream is what you press, so it rendered a status label in the one
  colour meaning "tap me". Shipped as the same neutral inset the merge marker got.
- **⚠️ The force-failure nearly recorded a false red.** Stashing the fixes and re-running gave **exit 1** —
  the right shape of proof. It was `--reporter=basic`, a flag vitest 4 does not have; the suite never ran. A
  second attempt raced `git stash pop` and went *green* against restored code. Only the third, with a
  physical file backup and no chained commands, produced the real red naming the exact six offending lines.
  **"It went red" is not the check. "It went red for the reason I predicted" is.**

### Two things the work found that nobody was looking for

1. **The rubric was about to excuse both fixes.** `visual-qa-rubric.md` §(b) listed `#30D158` and the amber
   merge markers as do-not-flag. Left alone, the next pass would have graded the **new** palette against the
   **old** exemption — S42's exact finding about this same file, one section down. Both flipped to
   reportable; `PROJECT-CONTEXT.md` and a stale `mergeDotOnMultiSourceItem` capture fact went with them.
2. **`grocery-complete-banner` had no capture state and no spec assertion anywhere.** B1 repainted a surface
   the visual gate was structurally unable to see. New `grocery-complete` capture state. Same class as S47's
   "Layer A had never captured a sheet state."
3. **The `/visual-qa` pass caught a law-05 break in the first version of the fix — the gate earning its
   keep.** The merge marker shipped as an **inert** chip with fill + border, with the disclosure chevron
   still beside it. Law 05 says fill + border must respond to a tap; an inert pill next to the control that
   actually opens the thing is exactly what it forbids. **Invisible to every DOM assertion** — the markup
   was correct, only the meaning was wrong. Folded together: the marker IS the disclosure now
   (`2 dinners ⌄`) and the standalone chevron is gone. The cooked badge is deliberately left as a
   non-tappable fill+border chip, because the spec's §07 gallery draws exactly that component.

### ⛔ NOT yours any more — DO NOT do the BUG-042 toggle

**Retracted. Disabling the Supabase Email provider would turn all 121 E2E specs red.** The standing
instruction ("the app has never used that path, so turn it off") rested on a premise that is **false**: the
harness's only sign-in is `signInWithPassword` (`tests/e2e/harness/supabase-session.ts:160` and `:174`),
which rides the email provider — and line 182's own error string already said *"Check that the Email
provider is enabled."* Nobody connected that string to this row for four sessions, and Claude repeated the
instruction twice in S52 without checking it.

**Fifth instance of the phase's running lesson, and the sharpest one:** a parked recommendation is a
hypothesis, and this one was not merely wrong but *destructive*. The email path is **load-bearing test
infrastructure**, not dormant surface area.

This now bundles with the separate non-prod Supabase project decision — that project is what would let prod
disable Email while the harness keeps it on where it lives. See [open-questions.md](open-questions.md).

**✅ `maxDuration` is CLOSED — it was NOT clamped.** Checked in S52 via the Vercel API rather than handed
back: the production build of `00062a4` (the tree carrying `maxDuration = 120`) completed with **no clamp
warning and no error** and deployed READY. Vercel fails the build outright when the value exceeds the plan
ceiling, so 120 was accepted and **fluid compute is on**. No dashboard visit needed. *Residual, stated
rather than buried:* this proves the declared ceiling was accepted at build time; only a real generation
running past 60s proves the runtime honours it, and there has not been one.

**The separate non-prod Supabase project** — still open, still a decision rather than a defect.
Recommendation unchanged: **V1.5**. Write-up in [open-questions.md](open-questions.md).

### ⭐ Next up — the rest of Workstream B, in this order

**B9** (BUG-037/038, recipe-detail loading + empty states) → **B2** (square the nav's top corners) → **B3**
(44px hit targets) → **B4** (promote faked subsection headings) → **B6** (the S48 critic slate's four) →
**B7** (three remaining freeform controls) → **B8** (type scale, motion, component library).

**B1 + B5 are closed** — their `/visual-qa` pass ran and cleared at 0 blockers / 0 high on both surfaces,
with all 13 states `captureStatus: ok`.

**No taste calls are pending on any of the seven.** B6 carries the closest thing, and those four were
already adjudicated by the S48 slate.

⚠️ **One thing for whoever takes B7:** the capture run flagged `CAPTURE_ISSUE you-field-editor` (a You-tab
state failing its pre-shot check). Not on a B1/B5 surface, so it was flagged rather than folded in — but
the You freeform control is B7's scope and this should be answered there, not silently inherited.

**🎨 Design pass — SKIP for B, RECOMMENDED for C.** B applies a locked spec to already-designed surfaces,
and scope-1F's own rule is that 1F must not produce a new all-states pass; B5's call landed as a
token-and-treatment swap rather than a new component, which was the one condition that would have changed
that. **C is the reversal:** the app icon, splash/launch screen, install prompt and offline
grocery-list state exist in no spec and no mock, it is net-new surface, and it is what Griffin sees every
time he opens the app from his home screen.

### ⚠️ The order is settled, and the reasoning changed (S52)

**B → C → D, then the two validation weeks.** Claude proposed pulling D's instrumentation forward to start
the clock ~2 weeks earlier; **Griffin overruled it on two better arguments:**

1. **Validate the artifact you ship.** The PWA is how he actually intends to use the product, so a
   browser-tab validation spends the two expensive, uncompressible weeks on a configuration that is not
   what ships — the result either does not transfer or has to be re-run.
2. **Observability is the debugging substrate for the validation weeks, not just the DoD metric.** Claude
   had scoped D too narrowly. Its bigger job is that Griffin reports a bug and Claude can *see* the error
   and the path, rather than working from a description. Since B → C → D already puts D before validation,
   his order already satisfied the concern the reorder was chasing.

**Consequence: PostHog session replay is now in D**, because the event taxonomy gives a sequence and Sentry
gives a stack — neither shows what he tapped. ⚠️ **Its masking posture must invert the vendor default:**
these tools mask *input fields*, but this app's sensitive material is rendered **output** (the chef's
memories, the interview's dietary/health answers, household composition, the grocery list). Mask everything,
unmask chrome and structure. Same argument that made BUG-018's guard an allow-list. Full entry in
[decisions.md](decisions.md).

### Also still open

- **BUG-045 🟡 (new, S52)** — the quick-add dedupe notice is the same amber miscast one affordance over, and
  is now the last `#FF9F0A` in the product. Deliberately not swept: Griffin's call named the merge markers.
  ⚠️ `palette.test.ts` allow-lists that exact line, so **closing it turns the test red until the exception is
  deleted too.**
- **BUG-044 🟡** (→ Workstream D's security review), **BUG-023** (V1.5+, not reachable today), **BUG-017**
  (→ Workstream D), **BUG-003**, **BUG-037/038** (→ B9).

**⭐ Model recommendation: Opus 4.8.** The remaining seven are judgement against a locked spec — reading
captures, grading them against the six laws with the gold line as tie-breaker, and applying small
colour/geometry changes. Same work 4.8 did well across S40/S42/S45/S47/S48. **Go higher only if you take
Workstream D first** — the security review of the full surface is the one remaining item with real reasoning
in it.

**Copy-paste kickoff prompt:**
```
Resume meal app — S52 opened 1F Workstream B and built B1 + B5 together (I answered both taste calls: merge
markers are a neutral inset with the count as type, and the cooked check KEEPS #9CB86F). 691 unit + 121 E2E
green on main, lint + typecheck clean. Worth carrying: the lesson changed shape a fourth time — S50 the
tracker was wrong about what the bug WAS, S51 right about the bug and wrong about the FIX, S52 the bug had
already fixed itself and the doc had the reason backwards. The "indigo draft pill" hadn't been indigo since
1E.7 aliased --primary to cream; the real defect underneath was that it had become CREAM, the action hue, so
a status label was wearing the one colour that means "tap me". Also: the visual-qa rubric's own do-not-flag
list was about to excuse both fixes, and grocery-complete-banner had no capture state or spec assertion at
all. And my force-failure nearly recorded a false red twice (a vitest flag that doesn't exist, then a race
with git stash pop) — "it went red" is not the check, "it went red for the reason I predicted" is. Next:
run the /visual-qa pass B1+B5 still owe (0 blockers/0 high), then the remaining seven B items in order —
B9 (BUG-037/038), B2 (square the nav's top corners), B3 (44px hit targets), B4 (heading levels), B6 (the
S48 critic slate's four), B7 (three freeform controls), B8 (type scale/motion/component library). No taste
calls pending on any of them. Read docs/whats-next.md, docs/scope-v1.md and docs/scope-1F.md first, give me
the <=6-line scope check. Still owed from me: the BUG-042 Supabase toggle (disable the Email provider) and
the non-prod Supabase project call (your rec is V1.5, in open-questions.md). maxDuration is CLOSED — it was
not clamped, fluid compute is on, don't raise it. On Opus 4.8.
```

**Design-independent alternative** (identical here — B has no pending taste calls — so this is the
"skip ahead to production readiness" option instead):
```
Resume meal app — S52 built 1F/B1 + B5 (691 unit + 121 E2E green on main). Skip the rest of Workstream B
this session and do Workstream D, production readiness, instead: PostHog with the S9 event taxonomy +
Sentry, and specifically the time-to-list instrumentation the DoD needs — an event at intent-submit and one
at list-ready, which has to ship BEFORE the two validation weeks start or the weeks don't count. Then the
security review of the full surface (BUG-044 is routed there: interviewStateSchema types dietaryFramework as
a bounded string where the persist path enforces an enum) plus the rate-limiting audit, per the standing
rule that live-code vulnerabilities ship as their own PR first. Then the error-state sweep and BUG-017, and
verify the access gate really is open in both directions on prod. Read docs/whats-next.md, docs/scope-v1.md
and docs/scope-1F.md first, give me the <=6-line scope check, keep 691 unit + 121 E2E green. On Opus 4.8.
```

---

## ⚠️ S51 (superseded by S52 above — B1 + B5 are built)

**S51 closed A4 (BUG-013), A5 (BUG-042/043) and A6 (BUG-018)** as PRs **#12** and **#13**. `main` is at
**688 unit + 121 E2E green**, lint + typecheck clean, migration `0010` applied. Nothing left on a branch.
**Three of four workstreams remain: B (design system), C (PWA), D (production readiness).**

### The thing worth carrying, because it changed shape from S50

**S50: the tracker was wrong about what three of the six bugs WERE.** **S51: the tracker was right about the
bug and wrong about the FIX — twice.** A parked bug's "address by" line is a hypothesis from the day it was
filed, not a spec.

- **A4 · BUG-013.** The filed fix — *"recompute `memory` server-side from `(questionId, dimension, values)`"*
  — lands in `memoryForAnswer`, whose label lookup fell back to the **raw value** (`?? v`). Harmless on the
  client, which produced the values it is looking up; on the server `values` is caller-controlled at
  12 × 60 chars, so recomputing **alone** would have echoed ~720 characters of the caller's text into the
  sentence. **More than double the 300-char cap the filed bug had.** Measured, not reasoned: the naive
  version was built first and the values test went red against it. The generalisation: **a recompute is only
  as trustworthy as the inputs it recomputes from, or it is laundering.**
- **A6 · BUG-018.** The filed fix named `assertNotProductionUrl()`. No property of a URL says "production,"
  so any such function has to enumerate prod and pass everything else — **failing open on exactly the
  unrecognised project the guard exists for.** Shipped as an allow-list with a **committed** ref, because a
  guard living in `.env.local` cannot catch a bad `.env.local`.
- **A5 · BUG-042 was measured instead of assumed.** `GET /auth/v1/settings` says `external.email: true` with
  `mailer_autoconfirm: false` — confirmations required, so the bypass needs both halves and has one.
  **Not exploitable.**
- ⚠️ **Fourth "the apparatus could not fail" instance in five sessions — and it happened inside the
  workstream whose entire bar exists to catch it.** BUG-013's values assertion matched case-sensitively
  against a branch that lowercases its output, so it walked past a string that had in fact been planted.

### ⚠️ Two things are yours

**1. BUG-042 — the Supabase dashboard toggle.** Authentication → Sign In / Providers → **disable Email**.
Hygiene now rather than a fix (it is not exploitable, see above), but the app has never used that path and
an auth path nothing uses is surface area resting on a setting nobody re-reads. **Claude cannot do this.**

**2. The separate non-prod Supabase project — a decision, not a defect.** Full write-up in
[open-questions.md](open-questions.md). **My recommendation: V1.5, not now.** A second free-tier project
pauses on inactivity — we have that exact scar on this project — and an E2E suite that goes red for
infrastructure reasons trains you to ignore red, which is the failure BUG-019 cost three sessions to
unlearn. The realistic data-loss vector is closed by the guard: you would now need the right project **and**
a real household literally named `E2E Test Kitchen` **and** with exactly one member who is the harness's own
test user. **What would change my answer:** a second machine running the suite, or prod holding two real
households — both arrive with V1.5.

### ⚠️ One thing worth knowing, and it is not a bug

**Prod is open to anyone who finds the URL.** `disable_signup: false`, `google: true`, and both access-gate
env vars unset — your deliberate S49 no-beta call. `robots.txt` + `noindex` are what keep the URL unfound.
Stated because it came up while measuring BUG-042 and it should be a known state rather than a discovered
one.

### ⭐ Next up — Workstream B, the design-system pass

Spec §12 items **03/04/05/07**, plus the two semantic calls S42 deliberately did not make, the S48 critic
slate's four deferrals, and **BUG-037/038**. Full list in [scope-1F.md](scope-1F.md) → Workstream B. Each
item gets its own `/visual-qa` pass to **0 blockers / 0 high** — that per-surface discipline is exactly why
these were split out of 1E.7's mechanical sweep.

**Two of the nine are yours to call, and they are taste rather than execution:** **B5**, the amber `#FF9F0A`
Groceries merge markers (the spec has no caution hue *because amber is the chef*, so a merge marker in amber
says the chef is speaking when the chef is not — my recommendation is a neutral inset with the count as
type, matching how the caught-tray chip resolved under the gold line), and whether the cooked/complete check
carries `#9CB86F` or no hue at all.

**🎨 Design pass — offered, and my recommendation is to skip it.** Workstream B is applying a spec that is
already locked to surfaces that are already designed; scope-1F's own rule is that 1F must not produce a new
all-states pass. A Claude Design round would buy re-litigation of decisions already made. **Where it would
earn its keep:** only if B5's merge-marker call turns out to want a new treatment rather than a token swap.
Say the word and I'll run it then.

### Owed, unchanged

- **`maxDuration` 120 on the generation route** — still worth a look. Hobby allows 300s with fluid compute
  (on by default), so it should just work; if it got clamped, fluid compute is off on the project and needs
  flipping on. Free toggle, one dashboard visit.

### Also still open
- **BUG-044 🟡** (new, S51) — `interviewStateSchema` types `dietaryFramework` as a bounded string where the
  persist path enforces an enum. Not an injection path any more; routed to **Workstream D**'s security
  review because narrowing it means moving the framework list into a shared pure module.
- **BUG-023** (V1.5+, not reachable today), **BUG-017** (→ Workstream D), **BUG-003**, and
  **BUG-037/038** (→ Workstream B). All with address-by targets in [bug-tracker.md](bug-tracker.md).

**⭐ Model recommendation: Opus 4.8.** Workstream B is judgement against a locked spec — reading captures,
grading them against the six laws with the gold line as tie-breaker, and applying small colour/geometry
changes. That is the same work 4.8 did well across S40/S42/S45/S47/S48. No new architecture. **Go higher
only if you take Workstream D first** — the security review of the full surface is the one remaining item
with real reasoning in it.

**Copy-paste kickoff prompt:**
```
Resume meal app — 1F Workstream A is CLOSED at 6 of 6, all merged to main (PRs #9-#13). S51 closed A4
(BUG-013), A5 (BUG-042/043) and A6 (BUG-018). Worth carrying: S50's lesson changed shape — S50 the tracker
was wrong about what the bugs WERE, S51 it was right about the bug and wrong about the FIX, twice. BUG-013's
recommended recompute would have echoed ~720 chars of caller text (the label lookup fell back to the raw
value) where the filed bug capped at 300, and BUG-018's named assertNotProductionUrl() would have failed
OPEN on every unrecognised project, so it shipped as an allow-list with a committed ref instead. So: treat a
parked bug's recommendation as a hypothesis, not a spec, and force the failure before and after. Next is
Workstream B, the design-system pass — spec §12 items 03/04/05/07, the two semantic calls S42 didn't make,
the S48 critic slate's four deferrals, and BUG-037/038, each with its own /visual-qa pass to 0 blockers/0
high. Two calls are mine and I'll answer at the top: B5's amber Groceries merge markers (your rec is a
neutral inset with the count as type, since amber is the chef) and whether the cooked check carries #9CB86F
or no hue. Read docs/whats-next.md, docs/scope-v1.md and docs/scope-1F.md first, give me the <=6-line scope
check. 688 unit + 121 E2E green on main, migration 0010 applied. Still owed from me: the BUG-042 Supabase
toggle (disable the Email provider), whether maxDuration 120 got clamped on the generation route (if it did,
fluid compute is off and needs turning on), and the separate non-prod Supabase project call — your rec is
V1.5 and it's written up in open-questions.md. On Opus 4.8.
```

**Design-independent alternative** (if you'd rather not spend the session on taste calls):
```
Resume meal app — 1F Workstream A is CLOSED at 6 of 6, all merged to main (PRs #9-#13). Skip Workstream B
this session (it opens with two taste calls of mine) and do Workstream D, production readiness, instead:
PostHog with the S9 event taxonomy + Sentry, and specifically the time-to-list instrumentation the DoD needs
— an event at intent-submit and one at list-ready, which has to ship BEFORE the two validation weeks start
or the weeks don't count. Then the security review of the full surface (BUG-044 is routed there: the
interview input types dietaryFramework as a bounded string where the persist path enforces an enum) plus the
rate-limiting audit, per the standing rule that live-code vulnerabilities ship as their own PR first. Then
the error-state sweep and BUG-017. Read docs/whats-next.md, docs/scope-v1.md and docs/scope-1F.md first,
give me the <=6-line scope check, keep 688 unit + 121 E2E green. On Opus 4.8.
```

---

## ⚠️ S50 (superseded by S51 above — Workstream A is closed at 6 of 6)

**S50 closed A1, A2 and A3 as three merged PRs (#9, #10, #11).** `main` is at **671 unit + 121 E2E green**,
lint + typecheck clean, migration `0010` applied. Nothing is left on a branch.

### What closed, and the part worth remembering

**Three of the six bugs were mis-described in the tracker, and twice the real defect was worse than the
filed one.** Reading the code was not enough to find that — each took forcing the failure and looking.

- **A1 · BUG-035** was filed as "a 90-second server-side timeout" with two open questions. **Both tracker
  answers were wrong.** There is no 90s timeout in the app (the only `90_000` is the Playwright `waitFor`
  ceiling; S45 recorded the harness's own wall as the server's), and the failure card was **unreachable on
  every path**, not just the guarded one — `useObject` reports a stream that dies mid-pipe as one that
  *completed*, so nothing rendered at all. First run erased your typed request; regenerate silently
  reappeared the old plan. **🔴, not 🟡.** Fixed in four parts + a timeout ladder pinned by a test that
  scrapes `maxDuration` out of the route source.
- **A2 · BUG-020/021** — the in-flight save bucket, and a skip that silently didn't stick. The subtle half:
  a state update from an awaited callback is not visible to the closure that awaited it, so the failures
  list needed a synchronously-written ref mirror or the fix would have passed the same lie one step later.
- **A3 · BUG-011/012/010** — **this doc's own recommendation had a hole** (read-only `householdSize` would
  have broken both bare-count writers). Griffin chose the real fix over two cheaper ones; the You tab now
  edits bands through a `HouseholdComposer` shared with onboarding, the talk op is band-aware, and the
  scalar is read-only.

### ⭐ Next up — A4, A5, A6, then Workstream B

1. **A4 — BUG-013 🟠**, marked *before R1 ship*. `finishOnboarding` trusts client-supplied memory text, so
   an authenticated caller can plant 300 characters into `ai_memories` stamped `sourceType: 'onboarding'`
   — the exact provenance the You ledger displays as *"You told me when we started."* Recompute `memory`
   server-side from `(questionId, dimension, values)` and ignore the client's field entirely.
2. **A5 — BUG-042 / BUG-043.** Neither is a code defect. BUG-042 is a **Supabase dashboard toggle** (disable
   the email provider; the app only ever uses Google) and needs Griffin, not Claude. BUG-043 is **correct to
   leave in place through all of R1** and graduates to the launch-day checklist.
3. **A6 — BUG-018 🟠.** `seed.ts` runs deletes against production guarded only by a household *name*. Add
   `assertNotProductionUrl()` — that is the cheap fix and it lands here. **The real answer is a separate
   non-prod Supabase project, and whether to do that now or at V1.5 is Griffin's call.**
4. Then **Workstream B**, the design-system pass (spec §12 items 03/04/05/07), which is where the four
   S48 critic items and BUG-037/038 land.

### Owed, unchanged

- **✅ `DEV_TOOLS_EMAILS` — CLOSED.** Griffin verified test mode is live on prod (S50). Carried for nine
  sessions; it is done, and it should not appear in another owed list.
- **One deploy-time check new from S50:** `maxDuration` is now **120** on the generation route. Hobby allows
  300s with fluid compute (on by default), so this should just work — but if it gets clamped, fluid compute
  is off on the project and needs flipping on. Free toggle, one dashboard visit.

### Also still open
- **BUG-037, BUG-038** (→ Workstream B), **BUG-023** (V1.5+, not reachable today), **BUG-017**, **BUG-003**,
  and the four S48 critic items (Recipes `+` weight, vocabulary unification, cooked-when evidence,
  caps-label tracking). All with address-by targets in [bug-tracker.md](bug-tracker.md).

**⭐ Model recommendation: Opus 4.8.** A4 is a security fix on a provenance boundary — recomputing memory
text server-side means deciding what the server considers authoritative, which is judgement about trust,
not mechanical work. A6 carries a real architecture call (separate non-prod project or not). If the session
is only A5's dashboard toggle plus doc work, Sonnet 4.5 is enough.

**Copy-paste kickoff prompt:**
```
Resume meal app — 1F Workstream A is 3 of 6 done, all merged to main (PRs #9, #10, #11). S50 closed A1
(BUG-035), A2 (BUG-020/021) and A3 (BUG-011/012/010). Worth knowing: three of those six were
mis-described in the tracker and twice the real defect was worse than the filed one — BUG-035 had no 90s
timeout at all (that was the Playwright waitFor ceiling recorded as the server's) and its failure card
had been unreachable on EVERY path since it was written, because useObject reports a stream that dies
mid-pipe as one that completed. So: force the failure, don't just read the code. Next is A4 (BUG-013,
marked before R1 ship — finishOnboarding trusts client-supplied memory text stamped as onboarding
provenance; recompute it server-side from questionId/dimension/values and ignore the client field), then
A5 (BUG-042 is a Supabase dashboard toggle I have to do myself, BUG-043 is correctly a launch-day item),
then A6 (BUG-018, seed.ts deletes against prod guarded only by a household name — add
assertNotProductionUrl, and tell me whether a separate non-prod Supabase project is worth doing now or at
V1.5). Then Workstream B. Read docs/whats-next.md, docs/scope-v1.md and docs/scope-1F.md first, give me
the <=6-line scope check. 671 unit + 121 E2E green on main, migration 0010 applied. DEV_TOOLS_EMAILS is
verified and closed — don't raise it. Still owed from me: a look at whether maxDuration 120 got clamped on
the generation route (if it did, fluid compute is off and needs turning on). On Opus 4.8.
```

---

## ⚠️ S47 (superseded by S48 above — the taste pass decisions are made and built)

## **every 1E.5 gate is closed except yours. The taste pass is the last one.**

**S47 answered BUG-034, cleared Layer A on Slice 2, cleared Layer B on the pick path, and ran the critic.**
Scope doc: [scope-1E.5.md](scope-1E.5.md). Work is on **`session-43-1e5-plan-rebuild`, worktree
`../meal-app-1e5`**.

**606 unit + 110 E2E green, lint + typecheck clean, migrations `0007`–`0009` applied.**

### The headline is a bug that had been shipping since 1E.7 and was invisible on purpose

**Every `.glass-card`, `.glass-surface` and `.glass-sheet` in the app had NO backdrop blur in Chrome and
Android.** Those three classes hand-wrote `-webkit-backdrop-filter` beside the standard property;
`.spec-chrome` and `.spec-floating` did not. **lightningcss collapses that duplicate onto the prefixed
form and drops the standard one** — and Chrome removed `-webkit-backdrop-filter` years ago. The fill
stayed correct at `.94`, so a flat card looked deliberate rather than broken.

Two things kept it alive. **BUG-022 misdiagnosed it in S42** — it blamed the spec's intended `.94`
translucency and parked it for 1F on that basis (*"do not raise the L5 alpha"*). The alpha was never the
problem. And **Layer A had never captured a single sheet state**: W7's meal sheet shipped in S44 and
Slice 1 cleared 0/0 without one frame of the surface that sits on top of everything else. Both are fixed;
`globals.test.ts` now fails on any hand-written prefix.

### BUG-034 — you chose "split the output", and it works on the real model

`chefNote` carries the argument into the gold slot that already existed; the one-sentence ceiling lives in
**code** (BUG-033's lesson), and it **splits rather than truncates**, so nothing the chef wrote is lost.
Live claims came back at **76–89 characters**, and **the first meal now sits ~210px down** a 390×844
screen — three meals visible where the original defect showed none.

⚠️ **Residual, stated rather than buried:** the guarantee is one *sentence*, not one *line*. And the
**note** half is running long — 203 to 336 characters against a prompt asking for one or two sentences,
rendering as four to six lines of gold. The week is scannable now, so this is a **voice call, not a
defect** — tightening it costs the chef range, which is the same trade you already made once.

### Layer B: one guarantee finally fired, and two defects that only the real model could show

- **The absorption path executed live for the first time** — owed since S45. Round 1 absorbed 4 titles,
  round 2 absorbed 7, and both weeks said "grilled" exactly once, in the week's own voice. It needed a
  server log to see at all: absorption erases its own evidence.
- **A named night is honoured** (`asked=2026-07-31 landed=2026-07-31`).
- **BUG-040 🔴 fixed** — the chef was writing **`Day 0` / `Day 1` straight to the user**. BUG-031's exact
  defect through a second door: S45 gave *generation* a real day map and nobody asked whether *modify*
  had the same hole. It did. Verified live: it now says "Sunday" and lands on `2026-08-02`, which **is**
  a Sunday — the right name, not just a name.

### ⚠️ Two things are yours

**1. BUG-041 — §B's boundary sentence still does not appear, after two live rounds.** *"It's your recipe,
so I won't rewrite it."* was being requested **"in your summary"**, and the pick path returns
`chefResponse` — no such field. The prompt now names the real fields and a test pins it, **and round 2
still produced the sentence zero times.** So it stays a guarantee on paper.

**My recommendation: stop asking, per BUG-033's precedent.** A style clause competing with six other
instructions loses. The boundary is a **fixed product promise**, not a creative act — render it as copy
on the picked row or the picker's confirm line. That moves a sentence out of the chef's voice into the
product's, which is why I have not done it unilaterally.

**2. The critic returned 18 findings and 16 are staged for you.** Two were correctness and are fixed
(search escaping a pushed tile; a verb promising a placement the product cannot make). The rest are
design calls, and several **disagree with a locked frame** — the ones worth your attention first:

- **The picker has four different heights** (176 / 274 / 365 / 400 / 515px across states) because the
  drawer is `h-auto` with `max-h-[80vh]`. The frame draws a fixed pane. This reframes the "76 vs 176px"
  item: it is not a number, it is that the walls move 339px when you push a door.
- **`3 of these have been waiting — you've got 30 minutes`** sits directly above two rows that say
  *longer than Friday allows*. The chef failing to read its own list, in the first sentence of the
  newest surface.
- **Multi-select is illegible across sections** — one checkbox visible, the second pick unnamed and
  unreachable except by `Clear`.
- **`Recently saved` and `Everything` are the same set** for any library under 13 recipes, which is
  most of R1. Two of four doors are duplicates on a real first visit.
- **The gold budget on `picked-row`** — the critic argues the boundary sentence is now typographically
  identical to seven cheap rationales, so the one sentence that had to be singular is item one of eight.

Full text in the session log; I did not apply them because they are taste, and taste is yours.

### Also still open
- **`DEV_TOOLS_EMAILS` in Vercel Production** — eighth session. Test mode is invisible and inert until
  you set it.
- **BUG-035** — 1 real generation in 9 timed out server-side at 90s; nobody knows whether that path
  shows a named failure or a spinner that never resolves.
- **BUG-037 / BUG-038** — new, both 1F: `Add to this week` reads as dead while the plan query loads; the
  recipe detail screen renders empty labelled `INGREDIENTS`/`STEPS` cards.
- **scope-v1's closed-beta question** — parked for 1E, closed without it, now gating 1F's shape.

### ⭐ Next up: your taste pass, then 1E.5 closes → M5.5, and 1F opens

**⭐ Model recommendation: Opus 4.8.** What is left is judgement and copy against a locked spec — reading
the critic's 16 staged findings, deciding which are right, and applying small copy/geometry changes. That
is the same work 4.8 has done well across S40/S42/S45/S47. No new architecture.

**Copy-paste kickoff prompt:**
```
Resume meal app — S47 closed every 1E.5 gate except my taste pass. BUG-034 is fixed the way I chose
(chefSummary split into a one-sentence claim + a new chefNote carrying the argument into the gold slot,
ceiling enforced in code and splitting rather than truncating; live claims came back 76-89 chars and the
first meal now sits ~210px down). Layer A caught the headline: every .glass-card/.glass-surface/
.glass-sheet in the app has had NO backdrop blur in Chrome since 1E.7, because hand-writing
-webkit-backdrop-filter beside the standard property makes lightningcss drop the standard one — which
also means BUG-022 was misdiagnosed in S42 as the spec's intended .94 translucency. Layer B fired the
absorption path live for the first time (owed since S45), verified the named night is honoured, and
found BUG-040 (the chef writing "Day 0" straight to the user — BUG-031's second door, in modify rather
than generation; fixed and verified live). 606 unit + 110 E2E green, worktree at ../meal-app-1e5 on
session-43-1e5-plan-rebuild. Read docs/whats-next.md, docs/scope-v1.md and docs/scope-1E.5.md first,
then give me the <=6-line scope check. Then walk me through the taste pass: pull up the final captures
in tests/e2e/captures/A-2026-07-30T18-21-07-378Z/ and give me your own read on the picker before I give
mine. Two calls are mine and I'll answer at the top: BUG-041 (the boundary sentence "it's your recipe,
so I won't rewrite it" has now failed to appear in two live rounds — your rec is to stop asking and
render it as product copy, per BUG-033), and which of the critic's 16 staged findings to apply. When my
taste pass lands, 1E.5 closes -> M5.5 and 1F opens. On Opus 4.8.
```

**Design-independent alternative** (if you'd rather burn down bugs than do the taste pass):
```
Resume meal app — S47 closed every 1E.5 gate except my taste pass (see docs/whats-next.md). Skip the
taste pass this session and clear the bug list instead, in this order: BUG-041 first (§B's boundary
sentence has failed to appear in two live Layer B rounds — apply your recommendation and move it out of
the prompt into product copy, per BUG-033's precedent), then BUG-035 (a real generation timed out at 90s
— find out whether that path shows a named failure or a spinner that never resolves), then BUG-037 (Add
to this week reads as a dead grey control while plan.current loads) and BUG-038 (the recipe detail screen
renders empty labelled INGREDIENTS/STEPS cards — §D already settled this rule for Plan: a container needs
contents), then BUG-020/BUG-021 (a failed save reported as "All saved."; a failed skip that still walks
the user out), then BUG-011/BUG-012 (householdSize <-> composition desync putting two contradictory
numbers in one chef prompt). Read docs/whats-next.md + docs/bug-tracker.md first, give me the <=6-line
scope check, keep 606 unit + 110 E2E green. Worktree at ../meal-app-1e5 on session-43-1e5-plan-rebuild.
On Opus 4.8.
```

---

## ⚠️ S46 (superseded by S47 above — the gates are closed and BUG-034 is fixed)

## 1E.5 is CODE-COMPLETE. **Close it: `/visual-qa` on Slice 2, then Layer B on the pick path.**

**S46 fixed BUG-019 rather than quarantining it, and built W8 + W10.** Every workstream W1–W10 is now
built; what remains are gates, not features. Scope doc: [scope-1E.5.md](scope-1E.5.md).

Work is on **`session-43-1e5-plan-rebuild`, in a git worktree at `../meal-app-1e5`**. Tidy up with
`git worktree remove ../meal-app-1e5` once this branch merges.

**591 unit + 108 E2E green, lint + typecheck clean, migrations `0007` + `0008` applied.**
**GR7 passed in the full sequential run** — the first time in four sessions, and the condition it actually
failed under.

### GR7 was never a timing problem. It was one specific race.

The helper pressed down, crossed `@dnd-kit`'s 8px activation distance, then fired ~24 more `mousemove`s
**back to back without ever waiting.** dnd-kit runs collision detection against a droppable-rect snapshot
taken when the drag *starts* — so when React had not yet committed the drag-start render, every move
resolved against nothing, `onDragEnd` got `over: null`, and the handler's first line returned early.
**No mutation, no error, no request.** A silent no-op that looks exactly like a broken feature, losing the
race only under load — which is precisely why it failed in full runs and passed in isolation every time.

Fixed by making the lift observable (`data-dragging` on the section — there is no `DragOverlay` here, so
"the drag is live" existed only as an opacity class), waiting on it, yielding a frame between moves, and
asserting the **whole persisted aisle order** against the order before the drag so a no-op can no longer
pass.

### What W8 and W10 actually are

**The picker is a third subject on the existing `PlanSheet`** — one drawer, content swapped in place, and
`L12` asserts that rather than trusting it. Content rules live in a pure `picker-helpers.ts` (19 tests):
`Saved, never cooked` as opening content with the chef *counting* them, four named doors with counts that
**push**, an unfittable recipe **dimming with its reason** instead of vanishing.

**Provenance travels as a `[N]` reference, never a DB id** — the `grocery.talk` pattern. The model sees
`[1] Spaghetti alla Carbonara` and returns `pickedRef: 1`; the server maps it against the list it sent, so
a hallucinated number resolves to nothing rather than to someone else's recipe.

**Both remaining build dependencies landed.** Dep 2: the chef returns the scaled count and the meta reads
`scaled to N` — **only where a scaling actually happened**, which `L10` pins by asserting a chef-proposed
night in the same week still says `serves`. Dep 4: a picked slot is written `recipeStatus: "ready"` on the
person's own recipe, which does two jobs — gives `normalizeSlot` something to warm off the confirm path,
and stops hydration generating a fresh recipe over one the person deliberately chose.

**W10 is both halves of `3l`.** The detail screen's `Add to this week` never asks for a day, and with no
week to add to it **carries** the recipe to the intent screen rather than failing at a button that reads
like it should work. The library's floating toolbar is deleted, search is in the header; `RC11` measures
`position: fixed` under `main` rather than trusting a class name.

### ⚠️ Two things I got wrong mid-build — both corrected, both worth knowing

1. **I made "the chef answers with a night" unconditional, which turned frame `3e`'s own primary into a
   lie.** `3e` reads **"Put it on Thursday"**. Tapping Thursday's dinner and having the chef put the
   recipe somewhere else is not §B being honoured. The rule and the frame describe different invocations:
   `3b` captions "The chef picks the nights"; `3e` names one, and tapping that meal *is* the person naming
   it. A named night is honoured now; the chef still owns the rest of the week either way.
2. **The generation fixture was prompt-blind, so "picks survive a regenerate" could not fail.**
   `buildGenerationFixture()` took no arguments and returned the same seven dinners for every request — a
   build that silently dropped every carried pick would have gone green. It reads the picks block now
   (`L15`). **Third instance of this class in three sessions** (BUG-030's stale capture spec, S40's
   `toContain` prompt test that passed silently). The rule they share: *the apparatus has to be able to
   fail.*

**And one spec I wrote wrong, which is worth knowing because the eyebrow is load-bearing.** `L15` asserted
`DINNER · PICKED` on a regenerated pick, and got `DINNER · TONIGHT · PICKED` — the pick lands on *today*,
so the relative label sits between the type and the provenance. The product was right; the assertion was.
Fixed to assert the whole correct string rather than loosened to a substring, because §B's rule is that
PICKED joins the **type line** and a looser match would pass on a badge rendered anywhere else on the row.
The same failure output also showed `40 min · scaled to 2` surviving the regenerate, which `L15` now pins.

### ⚠️ BUG-034 is still yours, and Layer A can finally see it

**My read, unchanged: it is not a copy-length problem, it is an unwired field.** Frame `3i` draws two
strings in the chef block at two sizes — a short claim at 22px cream (`Five dinners, one shop, nothing
wasted.`) and the argument at 14.5px italic gold. `chef-header.tsx` already has both props, and
`week-wrapped-state.tsx` passes both. **`plan-review.tsx` passes only `summary`**, and generation only
emits one `chefSummary`, so both of the model's sentences land in the 22px heading and the gold slot
beneath it renders nothing.

**Recommendation: split the output** — `chefSummary` becomes the short claim with a ceiling enforced in
code (BUG-033's lesson: a prompt clause loses to a competing pull), plus a `chefNote` carrying the
argument into the `rationale` prop that already exists. Costs about what "cap it at one sentence" costs,
and lands the frame instead of trimming to fit the bug.

**Done regardless:** the seed states now carry a realistically long summary. Every seed used to say
*"Your seeded test week, ready to review."* — one short line, which is exactly why nine lines of 22px type
never appeared in a mock capture. That is not a fix; it is what lets Layer A see the whole class.

### Three things deliberately NOT built — stated, not discovered

- **§B's who-clause (`Griffin's pick`)** needs a display name R1 has no surface for. The rule that
  provenance is never a possessive exists *because* a second person will one day be in the household —
  so it ships with household sharing (V1.5), not before.
- **§B's "too many picks → two options" (`3m`)** is a distinct screen with its own primary, and it only
  fires when the chef judges a week over-constrained — a judgement generation is not currently asked to
  make.
- **`LIBRARY_EMPTY` did not become a seed state.** The wipe already empties the library, so `EMPTY` *is*
  that state; a second name for identical rows is the duplication the rule targets.

### ⭐ Next up: close the phase

1. **`/visual-qa` Layer A on Slice 2's states** — the picker (opened, a tile pushed, multi-select, the
   empty library), a picked row on the rail, and the Recipes bottom edge on **both** screens. Slice 1
   cleared 0/0 in S44 and none of it was touched, so this is genuinely new surface.
2. **Layer B on the pick path.** Two guarantees are prompt-shaped and therefore only paper: the chef
   obeying a named night, and it stating the boundary in its own words. **Also still owed from S45:** the
   absorption path has never fired live.
3. **`ux-design-critic`, then your taste pass.** Then 1E.5 closes → M5.5, and 1F opens.

### Also still open
- **`DEV_TOOLS_EMAILS` in Vercel Production** — seventh session. Test mode is invisible and inert until
  you set it.
- **BUG-035** — 1 real generation in 9 timed out server-side at 90s; nobody knows whether that path shows
  a named failure or a spinner that never resolves.
- **scope-v1's closed-beta question** — parked for 1E, closed without it, now gating 1F's shape.

**⭐ Model recommendation: Opus 4.8.** What is left is judgement against a locked spec — reading ~10 new
screenshots and grading them against the six laws with the gold line as tie-breaker, then reading real
model output for whether two prompt-shaped guarantees hold. That is exactly the work 4.8 has been good at
across S40/S42/S45, and it is the same call that caught every Layer-B defect so far. No new architecture.

**Copy-paste kickoff prompt:**
```
Resume meal app — S46 closed BUG-019 by fixing it (GR7's three-session flake was a real race: the helper
fired ~24 mousemoves without waiting for the lift, so dnd-kit collided against an unmeasured snapshot,
onDragEnd got over:null, and the handler returned early — no mutation, no error, no request; now green in
the FULL sequential run) and built W8 + W10, so 1E.5 is CODE-COMPLETE. The picker is a third subject on
the existing PlanSheet (one drawer, content swapped in place); provenance travels as a [N] ref never a DB
id; build dependencies 2 (scaled to N, only where a scaling happened) and 4 (normalize cache warmed at
pick time) both landed; W10 deleted the Recipes floating toolbar and put `Add to this week` on the DETAIL
screen. 591 unit + 108 E2E green, worktree at ../meal-app-1e5 on session-43-1e5-plan-rebuild.
Read docs/whats-next.md, docs/scope-v1.md and docs/scope-1E.5.md first, then give me the <=6-line scope
check. Then close the phase: (1) /visual-qa Layer A on Slice 2's NEW states — the picker opened, a tile
pushed, multi-select, the empty library, a picked row on the rail, and the Recipes bottom edge on both
screens — iterate to 0 blockers/0 high; (2) Layer B on the pick path, because two guarantees are
prompt-shaped and therefore only paper (the chef obeying a named night, and it stating the boundary in its
own words), plus the absorption path still owed from S45 which has never fired live; (3) ux-design-critic,
then hand me the taste pass. I still owe you the BUG-034 call — your read is that it's an unwired field
(frame 3i draws two strings, chef-header has both props, plan-review passes only one), and I'll answer at
the top. On Opus 4.8.
```

**Design-independent alternative** (if you'd rather burn down bugs than run the gates):
```
Resume meal app — S46 closed BUG-019 and built W8 + W10, so 1E.5 is code-complete (see
docs/whats-next.md). Skip the closing gates this session and clear the bug list instead, in this order:
BUG-034 first (the chef summary pushes the first meal below the fold — your read is that it's an unwired
field: frame 3i draws a short claim at 22px plus the argument at 14.5px italic gold, chef-header.tsx has
both props, week-wrapped passes both, plan-review passes only summary, and generation only emits one
string; split chefSummary into claim + note with the ceiling in code), then BUG-035 (a real generation
timed out at 90s — find out whether that path shows a named failure or a spinner that never resolves),
then BUG-020 and BUG-021 (a failed save reported as "All saved."; a failed skip that still walks the user
out), then BUG-011/BUG-012 (householdSize <-> composition desync putting two contradictory numbers in one
chef prompt). Read docs/whats-next.md + docs/bug-tracker.md first, give me the <=6-line scope check, keep
591 unit + 108 E2E green. Worktree at ../meal-app-1e5 on session-43-1e5-plan-rebuild. On
Opus 4.8.
```

---

## ⚠️ S45 (superseded by S46 above — GR7 is fixed and W8/W10 are built)

### Layer B was CLEARED and it found four real defects. Its "quarantine GR7, then build W8 + W10" brief was executed in S46.

**S45 ran Layer B three times and it found four real defects.** All four are fixed and three are verified
live. Slice 2's provenance spine landed; its two entry points did not. Scope doc:
[scope-1E.5.md](scope-1E.5.md).

Work is on **`session-43-1e5-plan-rebuild`, in a git worktree at `../meal-app-1e5`** — a concurrent
process took the main checkout mid-session and made `session-43-access-gate` from `main`. **Nothing was
lost**, but you now have two working trees; tidy up with `git worktree remove ../meal-app-1e5` once this
branch merges.

**549 unit green, lint + typecheck clean, migrations `0007` + `0008` applied, Layer A 0/0, Layer B ×3.**

### ⚠️ GR7 hit the quarantine threshold — do this first

**BUG-019 recurrence #3.** The tracker's own disposition said one more recurrence quarantines it, and this
is it. Three sessions running, nothing in any of them touched Groceries, every other GR spec green in the
same runs. **The suite is now reliably training us to ignore a red**, which is exactly how a real Groceries
regression ships. Fix the drag properly (stepped pointer-moves, wait on the `@dnd-kit` overlay to mount,
assert persisted `aisleOrder` rather than rendered order) — it is the same machinery W10 is about to touch
anyway.

### What Layer B found — including one defect the last Layer B created

1. **BUG-031 🔴 — the chef named a day that hadn't happened yet and didn't have the ingredient.**
   *"Uses the leftover fresh dill from Monday"*, printed on a **Thursday**, on a Wed→Tue week whose Monday
   was four days later and served fried rice. **S40's own fix caused this.** S40 caught "reusing olive oil
   from day 0" and told the prompt to use weekday names — but nothing ever told the model *which* weekdays,
   so it mapped `dayOffset` onto a Monday start. **That made the S40 fix a downgrade rather than a repair:**
   "day 0" looks like a bug and gets reported; "Tuesday" looks correct and quietly misinforms. Fixed
   structurally — the user message now carries a real day map. Verified live.
2. **BUG-033 — W1's title rule was marked ✅ in the scope table and was never in the prompt at all.** Found
   by grepping for it while judging the run that existed to verify it. The four-or-more half now lives in
   **code**, because round 2 asked for "I want to grill" *with the prompt rule in place* and returned
   **seven of seven "Grilled X"** — S40's finding verbatim. A style clause cannot outrank the request it
   competes with. ⚠️ **The code path has not fired live** (round 3 produced no method-opening titles), so
   it is a guarantee on paper.
3. **BUG-032 — the reuse rule had colonised the chef's voice**, 7 of 7 rationales arguing waste. Capped at
   two; 2 of 7 live. Also the cause behind Layer A's "seven gold rationales read as texture, not voice."
4. **BUG-030 — the Layer B capture spec was the one Plan file S44's migration missed.** Round 1 paid for
   three real generations and threw them away against the deleted hero. A stale selector fails loudly and
   free everywhere else in the suite; **here it fails silently and bills you.**

**W6, judged rather than counted:** 63/63 slots priced, zero nulls, no clamping. The ranking is stable and
right — salmon the dearest night in every week, at exactly **$12.00 in three independent runs**. The level
is soft: **$44–$74** for seven dinners for two across runs of the *same* prompt, low end ~30% under a real
shop. Not a blocker (the row says "estimate"), but under-estimating is the worse direction. Two cheap
levers if you want them: price the whole meal rather than the headline protein, and name the servings count
in the cost instruction.

### ⚠️ One thing is yours, and it's the first thing you'll see

**BUG-034 — the chef's summary runs six to seven lines and pushes the first meal below the fold.** Every
real week opened on a wall of text. **Layer A is blind to it** because every seeded summary is one short
line, so no amount of mock testing would have shown you this. Three options, not equivalent: cap the prompt
at ONE sentence (cheapest, loses the chef's range), clamp the render to ~3 lines with the rest on tap
(keeps the voice, adds an interaction the ledger doesn't have), or drop the type size on long strings.
**Worth doing regardless: give the seed states a realistic summary**, or Layer A stays blind to this whole
class. See `tests/e2e/captures/B-2026-07-29T13-24-16-923Z/live-fridge.png`.

### Your two calls from last session — both taken as recommended
- **The cost number is off week-wrapped.** It lives on review and the confirmed grocery row. **W6 closes**;
  the wrapped half is descoped rather than owed, so its grocery query is no longer needed.
- **`Start over →` stays a foot link, gap tightened.** Plus the week's closing line drops 56px → 38px when
  it carries no control — most of the flagged void was button-sized space with no button in it.

### ⭐ Next up: W8 + W10, against a spine that already exists

**W9's spine landed and is gated by `L1`–`L4`.** Provenance is a nullable **`picked_recipe_id` column, not
a `slotType` enum value** — you ratified the deviation from build dependency 3, because the cookability
test is duplicated in **eight** places (two in the grocery collector, where a miss silently drops a
deliberately-chosen meal from the shop), and the column carries *which* recipe, which regenerate-survival
and pick-time cache-warming both need anyway. `DINNER · PICKED` now derives from data.

**What's left:** **W8** (the picker — settled approach: a *third subject on the existing `PlanSheet`*,
swapping content in place rather than stacking a second drawer, since D2's vaul pointer-events bug and §D's
one-floating-layer rule both argue against stacking) and **W10** (frame `3l` resolved the ambiguity — it is
the Recipes **detail** screen that takes `Add to this week`; "FAB deleted, search into the header" is the
**library** screen's half). Build dependencies 2 (servings scaling as a generation task) and 4 (warm the
normalize cache at pick time, on the existing `bgAiProcedure` 30/min bucket) ride along.

### Also still open
- **`DEV_TOOLS_EMAILS` in Vercel Production** — sixth session. Test mode is invisible and inert until you
  set it.
- **BUG-035** — 1 real generation in 9 timed out server-side at 90s. Worth knowing whether that path shows
  the user a named failure or a spinner that never resolves.
- **scope-v1's closed-beta question** — parked for 1E, closed without it, now gating 1F's shape.

**⭐ Model recommendation: Opus 4.8.** W8 and W10 are a large but well-specified build against a locked
ledger and a spine that now exists, with two named build dependencies and E2E coverage already written for
the half that landed. No new architecture. The GR7 quarantine is mechanical test work in the same file W10
touches.

**Copy-paste kickoff prompt:**
```
Resume meal app — S45 cleared Layer B and it found four real defects, all fixed: BUG-031 (the chef named a
weekday that hadn't happened and didn't have the ingredient — S40's own "use weekday names" fix caused it,
because nothing ever told the model which weekdays; fixed by sending a real day map, verified live),
BUG-033 (W1's title rule was marked done and was never in the prompt at all — the four-or-more half now
lives in code, since "I want to grill" beat the prompt rule 7/7), BUG-032 (the reuse rule had colonised the
chef's voice, 7/7 rationales arguing waste; capped, now 2/7), and BUG-030 (the Layer B capture spec was
stale and burned three real generations). Slice 2's spine landed: picked_recipe_id + migration 0008 +
DINNER · PICKED, gated by L1-L4. 549 unit green, worktree at ../meal-app-1e5 on branch
session-43-1e5-plan-rebuild. Read docs/whats-next.md, docs/scope-v1.md and docs/scope-1E.5.md first, then
give me the ≤6-line scope check. Then: (1) quarantine or properly fix GR7 — BUG-019 just hit recurrence #3
and the tracker's own rule says it's due; (2) build W8 (the picker, as a third subject on the existing
PlanSheet — no stacked drawer) and W10 (Add to this week on the Recipes DETAIL screen per frame 3l, plus
deleting the library's floating toolbar), honouring build dependencies 2 and 4; (3) extend the L family to
cover them. Tell me your read on BUG-034 (the chef summary runs six-to-seven lines and pushes the first
meal below the fold) before you start — it's mine to call and Layer A can't see it. On Opus 4.8.
```

**Design-independent alternative** (if you'd rather burn down bugs than build the picker):
```
Resume meal app — S45 cleared Layer B (four defects found and fixed, see docs/whats-next.md). Skip W8/W10
this session and clear the bug list instead, in this order: GR7/BUG-019 first (recurrence #3, the tracker's
own quarantine threshold — fix the @dnd-kit drag properly rather than retrying), then BUG-034 (the chef
summary pushes the first meal below the fold — give the seed states a realistic summary too, or Layer A
stays blind to the whole class), then BUG-035 (a real generation timed out at 90s — find out whether that
path shows a named failure or a spinner that never resolves), then BUG-020 and BUG-021 (a failed save
reported as "All saved."; a failed skip that still walks the user out), then BUG-011/BUG-012 (householdSize
↔ composition desync putting two contradictory numbers in one chef prompt). Read docs/whats-next.md +
docs/bug-tracker.md first, give me the ≤6-line scope check, keep 549 unit green. Worktree at
../meal-app-1e5 on branch session-43-1e5-plan-rebuild. On Opus 4.8.
```

---

## ⚠️ S44 (superseded by S45 above — Layer B ran and found four defects)

**S44 closed BUG-024 and finished Slice 1.** Scope doc: [scope-1E.5.md](scope-1E.5.md).
Work is on branch **`session-43-1e5-plan-rebuild`**, still not merged — Layer B and your taste pass are
the remaining gates.

**538 unit + 91 E2E, 90 green** (was 531 unit + **21 of 78 E2E red**), lint + typecheck clean, migration
`0007` applied, **`/visual-qa` Layer A at 0 blockers / 0 high**. The one red is **GR7** — the known
`@dnd-kit` drag flake (BUG-019, recurrence #2), green in isolation, untouched by this session's work.

### What the spec migration found — this is the headline

BUG-024's tracked cause list had three entries. **Five were real**, and the two untracked ones were the
consequential ones. Migrating the specs then surfaced **five more defects** in the rebuild itself
(BUG-025 through BUG-029), including a `Confirm` bar that scrolled off the bottom of a seven-day draft
and a Plan tab with no heading at all. **None of these were visible from the code.** They are the
argument for the ordering, in evidence.

### ⚠️ Two things are yours

**1. The `$94 spent` copy call — still owed, and now it blocks a build step.** My read, unchanged and
argued at length last session: **`~$94 est.`**, or better, **drop the number from week-wrapped
altogether** and keep it only on review. The asymmetry is what decides it — a forecast can't be
falsified, but "spent" is a past-tense claim about money you handed over, and it's the only string in the
product you can check against a receipt in your pocket. Review needs the number (it's an input to a
decision). Wrapped doesn't; it's a recap, and a cost figure there invites arithmetic instead of
reflection. **Wrapped renders no cost today** — the honest null-safe state. W6's wrapped half is blocked
on this either way.

**2. Where `Start over →` belongs on a draft.** The rebuild dropped it entirely (BUG-026) and I restored
it as a foot link under the rail, reusing the pattern mid-week already had. Frame `3i` doesn't draw the
bottom of the scroll, so this is my reading, not a locked decision — and visual-QA flagged that it now
sits in a ~100px void between the rail and the consequence line. **Say if you want it elsewhere.**

### ⭐ Next up: Layer B, then Slice 2

**Layer B is owed before the phase can close** and it is the one gate that can still find something real.
Two generation changes are invisible to the mock by construction: **W1's title rule** (titles never open
with a cooking verb; a method covering four-plus meals gets absorbed into the week) and **W6's cost
output**, which is a brand-new field the real model has never been asked for. The S40 precedent is the
reason to take this seriously — Layer B caught "reusing olive oil from day 0" printing onto a user-facing
card, which no amount of mock testing could have.

Then **Slice 2** (W8–W10: the picker, the picked meal, `Add to this week`) with all five of the brief's
named build dependencies.

### Carried from visual-QA, non-gating
Compact rows truncate titles at ~20 chars (only reachable once lunch/breakfast generation ships); seven
gold rationales reads as texture rather than voice at high dinner counts. Both in
`tests/e2e/captures/A-2026-07-28T14-17-42-005Z/critique.md`.

### Still your action (carried, fifth session)
**Set `DEV_TOOLS_EMAILS` in Vercel Production** to your address (and your wife's, comma-separated).
Test mode is invisible and inert until you do.

### Also still open
- **scope-v1's closed-beta question** — parked for 1E, closed without it, now gating 1F's shape.
- **Day-sheet vs in-rail expansion** (`1m`) — `1l` ships; `1m` needs usage, not a frame.

**⭐ Model recommendation: Opus 4.8.** Layer B is reading real model output for quality and judging copy
against a rule — exactly the work 4.8 is good at, and the same call that caught the S40 defects. Slice 2
is a large but well-specified build against a locked ledger with five named dependencies. No new
architecture in either.

**Copy-paste kickoff prompt:**
```
Resume meal app — 1E.5 Slice 1 is CODE-COMPLETE (S44). BUG-024 is closed: the Plan specs are migrated to
the rail, 538 unit + 90 of 91 E2E green (GR7 is the known drag flake, BUG-019), /visual-qa Layer A at 0
blockers/0 high, migration 0007 applied.
Branch session-43-1e5-plan-rebuild. Read docs/whats-next.md, docs/scope-v1.md and docs/scope-1E.5.md
first, then give me the ≤6-line scope check. Then run Layer B (npm run test:capture:live) — it's the one
gate that can still find something real, because two generation changes are invisible to the mock: W1's
title rule (no cooking verbs opening titles, a method covering 4+ meals absorbed into the week) and W6's
brand-new estCostCents field, which the real model has never been asked for. Judge the cost estimates for
plausibility, not just presence. Then open Slice 2 (W8-W10: the picker, the picked meal, Add to this
week) honouring all five of the brief's named build dependencies, and extend the specs with the L family.
Two calls are mine and I'll answer them at the top: the $94 spent copy, and where Start over belongs on a
draft. On Opus 4.8.
```

**Design-independent alternative** (if you'd rather burn down bugs than build Slice 2):
```
Resume meal app — 1E.5 Slice 1 is CODE-COMPLETE (S44), 538 unit + 90 of 91 E2E green on branch
session-43-1e5-plan-rebuild. Run Layer B first (npm run test:capture:live) to close out Slice 1's last
mechanical gate — W1's title rule and W6's new estCostCents field are both invisible to the mock. Then
skip Slice 2 this session and clear the open bug list instead: BUG-020 (retryFailed never awaits
in-flight saves, so "All saved." can be shown over a save that hasn't landed) and BUG-021 (a failed
skipOnboarding still walks the user out to Plan) first, since the interview fires once per account.
Then BUG-011/BUG-012 (householdSize ↔ composition desync putting two contradictory numbers in the same
chef prompt), then BUG-010 (household_composition ships with a column DEFAULT) and BUG-013
(finishOnboarding trusts client-supplied memory text). Read docs/whats-next.md + docs/bug-tracker.md
first, give me the ≤6-line scope check, keep 538 unit + 90 of 91 E2E green (GR7 is a known flake). On Opus 4.8.
```

---

## ⚠️ S43 (superseded by S44 above — BUG-024 is closed and Slice 1 is code-complete)

### S43 opened 1E.5 and built the rebuild's structural spine. Its "start with BUG-024" brief was executed in S44; the five-cause finding is recorded in the changelog.

---

## ⚠️ S42 (superseded by S43 above — 1E.5 is now open and building)

## ▶ 1E.7 is CLOSED. Open **1E.5's BUILD**: rebuild Plan to the landed design.

**S42 swept the app onto Design Spec v1.0 and ratified the gold line.** 1E.7 → ✅, M5.7 met.
**480 unit + 78 E2E green, lint + typecheck clean, `/visual-qa` re-captured across all five surfaces.**
Detail: [scope-1E.7.md](scope-1E.7.md).

### The gold line is ratified and applied

> **Gold marks the chef speaking, not content you read.**

It closed the S40 gold-budget question and all four onboarding conflicts, and it settled the S41
landed-ring question by the same rule (the shimmer bar and the highlight ring went **indigo → gold**,
because both mark the chef *working*). It is now the arbiter for every gold call in the Plan build.

**⚠️ One thing in your instruction disagreed with the build, so I left it alone.** You wrote
"orb/byline/hook stay gold." The orb is gold. The **byline** (`HERE'S WHAT I'M THINKING`) is currently
**cream**, and the **hook** is **`text.feature`** — neither is gold today. I read "stay" as *leave
alone* and did not escalate them, because raising a 25px hook to gold is a visual change rather than a
mechanical sweep. Under your own rule both are the chef speaking and would be defensible in gold. **Your
call** — it is a two-line change either way.

### What the sweep actually found (three things worth carrying forward)

1. **Item 02 was not what the spec said it was.** "Normalise the ambient wash — the rest carry six
   different gold opacities" describes the **design frames**. In the build, Plan / Recipes / Groceries /
   You had **no ambient wash at all**. So the item was additive: each surface got a named recipe for the
   first time. `ambient` where the chef talks to you (Plan, You), `flat` where you work in a dense list
   (Recipes, Groceries), `hero` reserved for the orb.
2. **"Retire the `:root` family" had to become an alias layer, not a deletion** — those names are the
   bridge Tailwind's `@theme inline` and every shadcn primitive read. The consequential alias is
   **`--primary`, indigo → cream**, which repaints every primary button in the app. Correct per §01
   (there is no third accent), and **the single most visible change in this sweep** — worth a look.
3. **Two clean greps still missed three live indigo glows.** `rgba(58,134,255,x)` hides inside
   `shadow-[…]`, so searching by token name or by `bg-`/`text-`/`border-` finds nothing. They surfaced
   only on reading the diff: cream buttons with blue halos under them. Also: **the worked example was not
   exempt** — onboarding carried four off-rung radii and an iOS-grey literal of its own.

### Repairs made to the QA apparatus itself (they were about to grade against the retired palette)

- **`PROJECT-CONTEXT.md`** still told Claude Design that Plan/Recipes/Groceries/You were "the before —
  do not sample colours from them." That is the exact divergence S40 caught. Rewritten, and it now names
  the three things still deliberately un-migrated.
- **`docs/design/visual-qa-rubric.md` §(b)** was checking for a "warm near-black bg (`#0E0E10`–`#141418`)"
  — the floor I just retired. It would have **passed the old palette and failed the new one.** Rewritten
  against the spec's six laws, with the gold line as the documented tie-breaker and an explicit
  do-not-flag list for the 1F items.
- **`.claude/commands/visual-qa.md`** named `Guidelines.md` as the visual system. Re-pointed at the spec.

### ⚠️ Still your action (carried, third session running)
**Set `DEV_TOOLS_EMAILS` in Vercel Production** to your address (and your wife's, comma-separated).
Test mode is invisible and inert until you do, and it is what makes re-running the interview free.

### Also still open
- **scope-v1's closed-beta question** — parked *for* 1E, and 1E closed without it. It gates 1F's shape.
- **The four Plan still-opens from S41** — day-sheet-vs-expand (needs usage, not a frame), the landed
  ring (now answered by the gold line: gold), the picker's four tiles (recommend push), and the
  **fictional `$94 spent` / `~$87`** on the week-wrapped and review screens. We have no cost model for a
  recipe, a plan or a list — either drop those numbers from the design or scope real estimation. **Decide
  before the build reaches those two states.**

### Next up: 1E.5's build
The design pass landed S41 and `surfaces/plan/brief.md` is the build spec — a decisions ledger plus five
named build dependencies. The palette it builds against is now the one shipping, which was the whole
point of ordering 1E.7 first.

**⭐ Model recommendation: Opus 4.8.** The brief has already made the design decisions, so this is a
large but well-specified build: rebuild Plan's states in real components, honour the five build
dependencies (staleness query, servings scaling as a generation task, a `slotType` for user-picked, warm
the normalize cache at pick time, and the Recipes toolbar change item 04 implies), extend the E2E specs,
and re-run visual-QA. That is execution against a locked spec, not new architecture. Read
`brief.md`'s "Still open" list before starting — three of the four are yours to call.

**Copy-paste kickoff prompt:**
```
Resume meal app — 1E.7 is CLOSED (S42). The whole app is on Design Spec v1.0: every cool-white alpha
warmed, each surface carries one of the three named wash recipes, radii on the eight-rung scale, and the
pre-spec :root family retired to an alias layer over --spec-* (including --primary indigo → cream, which
repainted every button). The gold line is ratified and applied: gold marks the chef speaking, not content
you read. 480 unit + 78 E2E green, visual-QA re-captured across all five surfaces. Read
docs/whats-next.md, docs/scope-v1.md and docs/design/surfaces/plan/brief.md first, then give me the
≤6-line scope check. Then open 1E.5's BUILD — rebuild Plan in real components to brief.md's decisions
ledger, honouring its five named build dependencies, and write a scope-1E.5.md first. Before you start:
give me your read on brief.md's four still-opens, especially the $94 spent / ~$87 cost numbers, since we
have no cost model and those two states can't be built until I decide. Keep 480 unit + 78 E2E green and
extend the specs for every new Plan state. On Opus 4.8.
```

**Design-independent alternative** (if you'd rather burn down bugs first):
```
Resume meal app — 1E.7 is CLOSED (S42), the app is on Design Spec v1.0. Skip the 1E.5 build this session
and clear the open bug list instead: BUG-020 (retryFailed never awaits in-flight saves, so "All saved."
can be shown over a save that hasn't landed) and BUG-021 (a failed skipOnboarding still walks the user
out to Plan) first, since the interview fires once per account and I'm about to run it for real. Then
BUG-011/BUG-012 (householdSize ↔ composition desync putting two contradictory numbers in the same chef
prompt, and the You tab saying "4 adults" for 2 adults + 2 children — same root), then BUG-010
(household_composition ships with a column DEFAULT so a default is indistinguishable from an answer;
needs a migration) and BUG-013 (finishOnboarding trusts client-supplied memory text). Read
docs/whats-next.md + docs/bug-tracker.md first, give me the ≤6-line scope check, keep 480 unit + 78 E2E
green. On Opus 4.8.
```

---

## ⚠️ S40 (superseded by S42 above — 1E.7 is now closed)

## ▶ 1E is CLOSED. Open **1E.7**: the mechanical design-system sweep.

**S40 closed 1E by clearing its three gates for real.** 5 of 6 phases done, M5 met.
**480 unit + 78 E2E green, planner eval 7/7, lint + typecheck clean.** Branch `session-33-you-tab-audit`.

### What the gates actually found

1. **`/visual-qa` → 0 blockers / 0 high** across 22 states, judged against **Design Spec v1.0's six laws**
   (not the superseded `Guidelines.md`). Two high fixes: the mic toast was letting the confirm + skip
   labels **ghost through it**, and the You capture was shooting the page before the test-mode card
   arrived — hiding it on one state and dropping it **under the tab bar** on another.
2. **Layer B answered your question: the reuse rule works and does NOT cost variety.** Six real weeks,
   7/7 distinct proteins and dish forms in every one, one bunch of dill finished across three different
   dishes. **But it caught three things the mock cannot see** — most seriously the internal `dayOffset`
   vocabulary printing **"reusing olive oil from day 0"** onto a card you read every week, and the chef
   inventing **"use spinach fresh from last shopping trip"** on a first-ever plan. One prompt clause fixed
   all three; round 2 verified them gone on the real model.
3. **`/code-review`** found pass 1 of the palette migration had warmed the *fills* but left
   `border-white/10` — the exact cool white law 04 forbids — on **every unselected chip and card in the
   interview**. Fixed. Two defects logged instead of fixed at the gate: **BUG-020** and **BUG-021**.

### ⚠️ Still your one action
**Set `DEV_TOOLS_EMAILS` in Vercel Production** to your address (and your wife's, comma-separated).
Test mode is invisible and inert until you do, and it is what makes re-running the interview free.

### Your call, carried from the visual-QA pass
Four places where the build is faithful to a **Claude Design pass you locked** and it is **Design Spec
v1.0 that disagrees**. I did not touch them — repainting the payoff screen of an interview you just
locked is your call, not a gate finding. Chiefly: the reflect screen's `SO HERE'S YOUR WEEK` renders
three to six lines of **gold body text**, against law 03 ("nothing you read twice is accent-coloured")
and law 06's three-gold-marks budget. Also the intro's gold icon tiles, the baby-stage gold chips, and
the caught-tray chip. Full argument (including a middle path that keeps the block's presence) in
`tests/e2e/captures/A-onboarding-2026-07-27T03-04-45-885Z/../critique.md`.

**Also still open from scope-v1:** does 1F include a small closed beta beyond you + your wife, or is
two-user validation enough to ship R1? That was parked *for* 1E and 1E has now closed without it.

### Next up: 1E.7 (before 1E.5)
The mechanical, app-wide half of the Design Spec v1.0 migration — items 01/02/06 plus retiring the
pre-spec `:root` family. It goes **before** 1E.5 because 1E.5 rebuilds Plan from scratch, and building
the signature surface against a palette we have already retired means building it twice. Onboarding is
the worked example, and S40 just cleared its last cool-white border.

**⭐ Model recommendation: Opus 4.8.** The edits are mechanical, but the bulk of the work is judgement by
eye — deciding which of the three named wash recipes each of five surfaces gets, mapping ad-hoc radii onto
the eight-rung scale, and then re-capturing and critiquing ~40 screenshots across all five surfaces for
regressions. That is reading and judging against a locked spec, not new architecture.

**Copy-paste kickoff prompt:**
```
Resume meal app — 1E is CLOSED (S40 cleared all three gates: visual-QA 0 blockers/0 high, Layer B verified
the ingredient-reuse rule on the real model and caught three copy defects the mock couldn't, code review
found the palette migration had left cool-white borders in onboarding). 480 unit + 78 E2E green, planner
eval 7/7. Read docs/whats-next.md, docs/scope-v1.md first, then give me the ≤6-line scope check. Then open
1E.7 — the mechanical design-system sweep, app-wide, BEFORE 1E.5: spec §12 items 01 (every
rgba(255,255,255,x) → rgba(240,222,190,x) at the same alpha), 02 (ambient wash normalised to the three
named recipes), 06 (radii onto the eight-rung scale), and retire the pre-spec :root family so every
surface runs on --spec-* tokens. Onboarding is the worked example — match it. Write a scope-1E.7.md first,
then sweep surface by surface, and finish with a /visual-qa re-capture of all five surfaces to prove no
regression. Before you start, give me your read on the four gold-budget findings I owe a decision on
(reflect's gold week list is the big one) — they're in the S40 critique.md. On Opus 4.8.
```

**Design-independent alternative** (if you'd rather burn down bugs first):
```
Resume meal app — 1E is CLOSED (S40). Skip 1E.7 this session and clear the open bug list instead:
BUG-020 (retryFailed never awaits in-flight saves, so "All saved." can be shown over a save that hasn't
landed) and BUG-021 (a failed skipOnboarding still walks the user out to Plan) first, since the interview
fires once per account and I'm about to run it for real. Then BUG-011/BUG-012 (householdSize ↔ composition
desync putting two contradictory numbers in the same chef prompt, and the You tab saying "4 adults" for
2 adults + 2 children — same root), then BUG-010 (household_composition ships with a column DEFAULT so a
default is indistinguishable from an answer; needs a migration) and BUG-013 (finishOnboarding trusts
client-supplied memory text). Read docs/whats-next.md + docs/bug-tracker.md first, give me the ≤6-line
scope check, keep 480 unit + 78 E2E green. On Opus 4.8.
```

---

## ⚠️ S39 (superseded by S40 above — its three gates were cleared)

## ▶ S39 — close 1E: `/visual-qa` critique loop → Layer B → `/code-review`

**Done S39 (a long session — Griffin's taste pass turned into a build).**

1. **BUG-016 + BUG-014 + BUG-015 closed.** A failed core save is now named, remembered and retried on
   "Plan my first week"; the reflect screen stops claiming "All saved" while anything is outstanding; a
   failed finish stays put with a live retry instead of walking you out to a plan built on nothing; the
   tell-me field clears on success only; the confirm is gated while a capture is in flight.
2. **The deep round got deeper** (Griffin's calls). New **`skill`** question; **`goal`** raised into reach
   because it already carried "Keep costs down"; **`effort`** kept but suppressed at a 30-minute ceiling.
   Round retuned 4 → **5** questions, **7/7 personas**. **Ingredient reuse is a planner default now**, not a
   preference — a perishable sold by the bunch gets a second, different dish that finishes it.
3. **Test mode shipped.** You tab → "Restart onboarding", server-gated by `DEV_TOOLS_EMAILS`. The interview
   fires once per account and this is what makes re-testing it free.
4. **Design Specification v1.0 arrived mid-phase** and was split into three passes (Griffin ratified):
   **pass 1 = onboarding, done this session**; **pass 2 = the new phase 1E.7**, mechanical and app-wide,
   ordered **before 1E.5**; **pass 3 = 1F**. See scope-v1's S39 change-log row for the ordering argument.
5. **The reflect playback is BUILT** from the design pass — three blocks, grouped by kitchen logic, with
   each captured thing restated as a decision about dinner. `ALREADY CIRCLING` is deliberately off.

**479 unit + 78 E2E green, planner eval 7/7, lint + typecheck clean.** Branch `session-33-you-tab-audit`.

### ⚠️ Griffin's one action before the next session
**Set `DEV_TOOLS_EMAILS` in Vercel Production** to your address (and your wife's, comma-separated). Test
mode is invisible and inert until you do, and the whole point of it is to make your real first run cheap
to repeat.

### What actually closes 1E
Three gates, and they are gates that were cleared in S38 and have been invalidated by this session's work:

1. **`/visual-qa` on onboarding + You.** The Layer-A captures exist and are clean (17 states, all `ok`,
   including the new `ob-reflect-deep` and `ob-reflect-sparse`), but the *critique-and-iterate-to-0-blockers
   loop has not run* on them. That is the gate, not the capture. You tab needs it too — the test-mode card
   is new UI there.
2. **Layer B.** Two reasons this time, not one: onboarding copy changed substantially, **and**
   `chef-system.ts` gained an ingredient-reuse rule. The mock cannot tell us whether the real model actually
   finishes the carton without collapsing the week's variety, and that is a change to the most consequential
   prompt in the product.
3. **`/code-review`** across this session's work. It is a lot of new surface: `playback.ts`,
   `use-onboarding-saves.ts`, `user-dev-tools.ts`, the rewritten reflect screen, the palette migration.

### Carried, not blocking
Owed taste passes (Slice C/D Groceries + Recipes reorg; Recipes double bottom-bar — note spec §12 item 04
fixes that one in 1F). **BUG-011/012** (householdSize ↔ composition desync) and **BUG-010** (composition
column default) are still open and are the next-best burn-down if you want a non-design session.
**BUG-019** (GR7 flake) has not recurred in three full runs.

**⭐ Model recommendation: Opus 4.8.** The critique loop is judgement against a locked spec, Layer B is
reading real output for quality, and code review is reading a large diff. None of it is new architecture.

**Copy-paste kickoff prompt:**
```
Resume meal app — S39 built the reflect playback, migrated onboarding to Design Spec v1.0 (pass 1 of 3),
deepened the interview (skill + cost, 5-question round), made ingredient reuse a planner default, and
shipped test mode. 479 unit + 78 E2E green, planner eval 7/7. Read docs/whats-next.md, docs/scope-v1.md,
docs/scope-1E.md first, then give me the ≤6-line scope check. Then close 1E with its three gates, in
order: (1) run /visual-qa on onboarding AND You and iterate to 0 blockers / 0 high — the captures exist
but the critique loop hasn't run on them; (2) run Layer B (npm run test:capture:live) — onboarding copy
changed AND chef-system.ts gained an ingredient-reuse rule, so I need to see whether the real model
actually uses up the carton without killing the week's variety; (3) run /code-review across the session's
new surface (playback.ts, use-onboarding-saves.ts, user-dev-tools.ts, the rewritten reflect screen, the
palette migration). When those land, 1E closes → M5 done, and 1E.7 (the mechanical design-system sweep)
opens BEFORE 1E.5. On Opus 4.8.
```

**Design-independent alternative** (if you'd rather burn down bugs):
```
Resume meal app — skip the 1E closing gates this session and clear the open bug list instead: BUG-011
(householdSize/composition desync putting two contradictory numbers in the same chef prompt), BUG-012 (the
You tab saying "4 adults" for 2 adults + 2 children — same root), then BUG-010 (household_composition
ships with a column DEFAULT so a default is indistinguishable from an answer; needs a migration) and
BUG-013 (finishOnboarding trusts client-supplied memory text). Read docs/whats-next.md +
docs/bug-tracker.md first, give me the ≤6-line scope check, keep 479 unit + 78 E2E green. On Opus 4.8.
```

---

## ⚠️ S38 (superseded by S39 above — those gates were invalidated by the S39 build)

**Done S38:** `/visual-qa` (0 blockers / 0 high, 3 rounds + the ux-design-critic pass), the first onboarding
**Layer B** real-model capture, and `/code-review` across four lenses. **449 unit + 75 E2E green**, lint + typecheck
clean. The onboarding capture harness is new this session — `/visual-qa` had no coverage for this surface at all.
Final captures: `tests/e2e/captures/A-onboarding-2026-07-25T17-33-21-019Z/` (+ `critique.md`).

### Griffin's taste pass — the four calls
1. **The baby-stage follow-up** (the deliberate addition to the locked design). It now arrives *pre-selected* at
   6-12 months with the amber note narrating the assumption, so the chips read as a correction rather than a second
   blank question. Does it feel like one extra tap, or like a form growing under you?
2. **The reflect hook.** Core-only completions used to fall through to a generic line; every branch now names a
   plate ("seared salmon with green beans that get some real char"), guarded so it can never name a food you just
   told it to avoid. Cook with a point of view, or receipt?
3. **Four deep questions.** Tunable via four numbers in `src/lib/onboarding/planner.ts`; re-run
   `scripts/1e-onboarding-planner-eval.ts` after changing any of them.
4. **The dinners stepper / lunch + breakfast toggles are still absent** from the hand-off (R1 generates dinners
   only, so they would be dead controls). Sanity-check that omission.

### ⚠️ Two fixes recommended BEFORE you and your wife run the interview for real
The interview fires **exactly once per account** — both complete and skip set `onboardingCompletedAt`, and
re-running is out of 1E scope. A half-saved first run is not recoverable by the user.
- **BUG-016** 🔴 — a failed preference save is silent, and the reflect screen still says "All saved."
- **BUG-014** 🟠 — typed text is cleared before the request resolves, so a failed capture loses the very message the
  error toast invites you to retry.

Seven more review findings are logged as BUG-010…BUG-018 in `docs/bug-tracker.md`; none block the taste pass.

### When the taste pass lands
**1E closes → M5 done**, then open **1E.5 (Plan Design Buildout)**.

**⭐ Model recommendation: Opus 4.8** — the taste pass is judgement plus small copy/UX edits, not new architecture.
If you'd rather have BUG-016/014 fixed first, that's also 4.8 work (two contained error paths plus their specs).

**Copy-paste kickoff prompt (taste pass):**
```
Resume meal app — 1E's three gates are cleared (visual-QA 0 blockers/0 high, Layer B run, code review done; 449
unit + 75 E2E green). Read docs/whats-next.md, docs/scope-v1.md, docs/scope-1E.md first, then give me the ≤6-line
scope check. Start by fixing BUG-016 and BUG-014 (silent save failure + typed text lost on error) — the interview
fires once per account and I'm about to run it for real. Then walk me through the taste pass: pull up the final
captures in tests/e2e/captures/A-onboarding-2026-07-25T17-33-21-019Z/ and give me your own read on the baby-stage
follow-up, the reflect hook, and whether 4 deep questions is the right depth, before I give mine. When my taste
pass lands, 1E closes → M5 done and we open 1E.5 (Plan Design Buildout). On Opus 4.8.
```

**Design-independent alternative** (if you'd rather not spend this session on taste):
```
Resume meal app — 1E is machine-complete and waiting only on my taste pass. Skip that this session and burn down
the S38 code-review findings instead: BUG-016 and BUG-014 first, then BUG-011 (householdSize/composition desync
putting two contradictory numbers in the same chef prompt) and BUG-012 (the You tab saying "4 adults" for 2 adults
+ 2 children). Read docs/whats-next.md + docs/bug-tracker.md first, give me the ≤6-line scope check, and keep the
E2E suite green. On Opus 4.8.
```

---

## ⚠️ S37 was infrastructure, not product (superseded by S38 above)

Session 37 ran the QA-process hardening plan (`~/.claude/plans/qa-process-hardening-and-ffos-port.md`)
and did no product work. What changed under you:

- **The E2E harness now works from a genuine cold start.** It no longer needs a
  service-role key, and deleting the test user no longer wedges the suite. Verified by
  deleting the identity outright and running from nothing.
- **`npm run test:capture` and `npm run test:capture:live`** are real scripts now (Layer A
  and Layer B), instead of raw `npx playwright -c ...` invocations.
- **The auto-invoking rules cover all five surfaces**, not just Plan — editing Groceries,
  Recipes, You or onboarding now nudges the E2E + visual-QA loop.
- **Two new Plan bugs are logged**: BUG-008 (the meal card prints the cook time twice, and
  two different times when they disagree) and BUG-009 (a null-title slot renders as the
  "Thinking…" state). Both are routed to **1E.5**, so read them before that buildout.
- **Layer B is owed on four tabs** — it has run once, on Plan only. `docs/test-plan.md`
  → "Layer-B cadence" has the triggers and the backlog.
- The harness was ported to **FFOS** and caught three real UI bugs there on its first run,
  which is the evidence that this layer earns its keep.

Nothing above blocks the 1E close. Proceed with it as written below.

---

## ▶ NEXT SESSION — 1E #4 is BUILT + fully machine-verified (70/70 E2E). Remaining to close 1E: `/visual-qa` → `/code-review` → **Griffin's taste pass**.

**Shipped S36:** the whole onboarding interview. Household-composition schema (band counts + a baby-stage follow-up;
`householdSize` derived server-side; migration `0006` applied), the deterministic tunable **deep-round stopping
policy** + its 6-persona eval, the full one-model-per-screen flow at `/welcome` (ember chef presence, 4-question core,
adaptive deep round, opinionated reflect), the first-run gate, `sourceType:'onboarding'` memory writes, and the
pre-seeded Plan intent hand-off (door #3).

**Verified:** **437 unit + 70 E2E green** (OB1–OB8 new, whole suite passing), **planner eval 6/6**, lint + typecheck
clean, migration applied. **No blockers, no Griffin action outstanding.**

**Two bugs found and fixed during the run** (both worth knowing about):
1. The new first-run gate was redirecting **every** spec to `/welcome` — the E2E user's `onboardingCompletedAt` was
   NULL. `auth.setup.ts` now stamps the harness's default identity as already-onboarded; `onboarding.spec.ts` restores
   that default in `afterAll` so it can't poison other specs whatever the run order.
2. **BUG-007 (resolved):** the harness couldn't authenticate at all. Root cause was the **harness, not the
   credentials** — this project uses the new `sb_publishable_`/`sb_secret_` keys with asymmetric (ES256) JWTs, and
   GoTrue's `/auth/v1/admin/*` endpoints reject a non-JWT secret key. `mintSupabaseSession` was calling
   `auth.admin.listUsers`/`updateUserById` to bootstrap a user that already existed. It now signs in with the
   publishable key first (also dropping a 50-page `listUsers` scan from every run) and only falls back to the
   privileged bootstrap if sign-in genuinely fails. `.env.local` was correct all along.

### To close 1E
1. **`/visual-qa`** against the locked design (`docs/design/surfaces/onboarding/brief.md`, direction 1D) — not yet run
   on this surface.
2. **`/code-review`** — not yet run on this build.
3. **Griffin's taste pass** (scope below). When those land, **1E closes → M5 done**, then **1E.5**.

### For Griffin's taste pass
- **The one deliberate addition to the locked design:** a **baby-stage follow-up** (Under 6 months / 6-12 / 12-24)
  appearing only when babies > 0, inside the amber note the design already reveals. It exists because Griffin's answer
  to "do babies count as a serving?" was "it depends on the baby's age." Does it read as one extra tap, or as a form?
- **The reflect screen's opinionated hook** ("I'm already picturing blistered shishitos and a chili-crisp salmon") —
  a cook with a point of view, or a receipt?
- **Deep-round depth** — 4 questions for an engaged user. The policy is four tunable numbers in
  `src/lib/onboarding/planner.ts`; re-run `scripts/1e-onboarding-planner-eval.ts` after changing any of them.
- **Deviation to sanity-check:** the hand-off screen's **dinners stepper + lunch/breakfast toggles were NOT built.**
  R1 generates dinners only (`mealType` hardcoded), so they'd have been dead controls. The hand-off is the real Plan
  intent screen, pre-seeded with the interview's chips + request.
- **The interview is live for Griffin + wife** — no backfill was applied, so both accounts will see it on next load.
  That's the real-user test.

### Carried, non-blocking
Owed taste passes (Slice C/D Groceries + Recipes reorg; Recipes double bottom-bar on a phone) + the You-tab taste pass
from S33. **BUG-005** (`font-sans`→serif; confirm on-device, 1F). **BUG-003** (recipe.list harvest). **BUG-006**
(expanded meal sheet → 1E.5).

**⭐ Model recommendation: Opus 4.8** — what's left is judgement work (visual critique against a locked design, code
review of a safety-adjacent capture path, taste iteration on chef copy), not new architecture.

**Copy-paste kickoff prompt (close 1E):**
> Resume meal app — the 1E onboarding interview (#4) is BUILT and fully machine-verified (437 unit + 70 E2E green,
> planner eval 6/6). **Close the phase:** run `/visual-qa` against the locked design
> (`docs/design/surfaces/onboarding/brief.md`, direction 1D) and iterate to 0 blockers / 0 high, then `/code-review`
> (not yet run on this build — pay attention to the `user.talk` capture path and the new tRPC mutations), then hand me
> the taste pass. In that hand-off, specifically call out: the **baby-stage follow-up** (your addition to the locked
> design), whether the reflect hook sounds like a cook or a receipt, and whether 4 deep questions is the right depth.
> Read `docs/whats-next.md`, `docs/scope-v1.md`, `docs/scope-1E.md` first, then give me the ≤6-line scope check. When
> visual-QA + review + my taste pass land, **1E closes → M5 done** and we open **1E.5 (Plan Design Buildout)**. On
> Opus 4.8.

## Exact Status (end of Session 30 — BUG-004 CLOSED + shipped)
- **BUG-004 resolved.** Full generation-architecture rethink shipped: normalize runs per-recipe during plan review
  (decoupled `plan.normalizeSlot` the walker fires after hydrate) and caches on the recipe row (`normalized_ingredients`,
  migration `0005` applied); confirm reads the cache + AI-normalizes only cache-misses → **zero AI calls at confirm on
  a fully-reviewed week → instant aggregate.** Phase D added the honest **"Finishing N recipes…"** straggler hint +
  early-confirm instrumentation.
- **Real-model eval PASSED (the load-bearing gate).** Per-recipe normalization == the old batch's merge quality
  (identical rows/sums/merges; scallion↔green-onion synonym canonicalized identically with no co-occurrence
  advantage). Latency: ~27s batch → **0 normalize calls at confirm** (aggregate ~0ms). Script:
  `scripts/bug004-normalize-eval.ts` (real spend — re-run for prompt-drift checks).
- **Code review found + FIXED a high-severity regression** before ship: `normalizeSlot` on the shared 10/min AI
  bucket would 429 user-visible hydrates on a full-week review. Fixed with a dedicated `bgAiProcedure` (own 30/min
  bucket, no daily-budget double-charge). `ratelimit.test.ts` locks the isolation.
- **Green:** lint + typecheck clean, **306 unit + 53 E2E** (GR-L1/GR-L2 new). The S28 60s stopgap timeout stays as
  belt-and-braces for the rare residual batch.
- **Deferred follow-ups (idea-backlog):** split `grocery-generate.ts` (313 > 300); strengthen GR-L2 to drive the full
  straggler transition; ingredient caching (#3, global-vs-household open Q); section-streaming (#2, measurement-gated).
- **Owed to Griffin — taste pass** (carried from S28, non-blocking): Slice C/D Groceries + Recipes reorg; the double
  bottom-bar density on a phone.

## Exact Status (end of Session 28 — Phase 1D CLOSED, shipped to prod)
- **Phase 1D (Groceries) is COMPLETE — 4 of 6 R1 phases done; merged to prod.** Wrap: code review (3 fixes),
  **merge quality PASSED the real-model soft DoD (#2), Griffin signed off**, visual-QA capture harness extended to
  Groceries + Recipes (gate: 0 blockers / 0 high), 60s normalize stopgap. 294 unit + 51 E2E green; lint +
  typecheck clean.
- **Merge eval result:** 9/9 sums exact, scallions==green-onion canonicalization worked, zero mis-merges; NL→ops
  clean. The hard V1 problem is solved for V1.
- **Next:** generation-architecture rethink (planning session, BUG-004) — see the kickoff + model reco above.
- **Owed to Griffin — taste pass** (carried, non-blocking): Slice C/D Groceries + the Recipes reorg — does the
  tier split read calm? Is the **double bottom-bar** (floating toolbar over the tab bar) too heavy on a phone?
  Mechanics AND pixels are machine-verified (visual-QA gate passed).
- **Parked bugs** (`docs/bug-tracker.md`): BUG-004 (generation latency — next), BUG-002 (merge duplicate lines →
  buy-unit fast-follow), BUG-001 (guessCategory compound-word misfire), BUG-003 (harvest writes in `recipe.list`).
- **Still deferred (design later):** mid-week resync + ack pill + `mergeOverrides`; bespoke empty/error states;
  **1F visual-refresh of Plan** to the Groceries fidelity bar; **manual recipe entry** (the ＋ menu's dropped "Add
  manually").

## Exact Status (end of Session 27 — Phase 1D Slice D COMPLETE)
- **Slice D done: #11 Talk-to-Chef ✅ + #12 staples ✅ (S26) + #14 Recipes reorg ✅ (S27).** The chosen Claude
  Design (direction "d") is built in real components: a `RECENTLY COOKED` strip, a segmented
  `All · Favorites · Cooked` library (paginated), a folded `FROM YOUR PLANS` shelf, and a floating search/＋
  toolbar. Favoriting a plan draft promotes it (detaches `sourcePlanId`) with a highlight ring + toast.
- **Cooked-signal harvest built** (`harvest-cooked.ts`): a recipe is cooked when it's the recipe of a past
  confirmed slot → lazy, idempotent, non-fatal stamp of `lastCookedAt` on `recipe.list`; cook + favorite both
  detach from the plan so history/promotions are durable. Draft = `sourcePlanId != null`.
- First-ever **Recipes E2E coverage**: RC1–RC10 (`recipes.spec.ts`) + 3 seed states. **294 unit + 51 E2E green**;
  lint + typecheck clean; prod build compiles.
- **Next:** Slice 5 wrap (real-model merge-quality eval + `/code-review` + `/visual-qa` + deploy) → closes 1D.
  See the kickoff prompt above.
- 3 of 6 R1 phases done (1A/1B/1C); 1D in progress (Slices 0/A/B/C/D done, only the wrap remains).

## Exact Status (end of Session 26 — Phase 1D Slice D partial)
- **Slice D: #11 Talk-to-Chef ✅ + #12 staples ✅** (the two Groceries-tab pieces, already in the imported
  design). **#14 Recipes-tab reorg is design-gated** — brief written + Claude Design pass kicked off (Griffin
  running it). Cooked signal decided (auto-stamp `lastCookedAt` from a past confirmed slot); its harvest builds
  with the reorg.
- Built S26: `staples` router + `StaplesRow`; the `grocery-talk` AI task (snapshot prompt + coercion) + the
  `grocery.talk` router (numbered-`[N]`-ref ID-safety, 12-op cap, add-dedupe); the Groceries brain-icon sheet
  reusing the relocated shared `TalkToChefSheet`; `grocery.addItem` `sourceType`; GR8–GR11 E2E + the
  `grocery-talk` fixture + staple seeding. **287 unit + 41 E2E green**; lint + typecheck clean.
- **Next:** #14 Recipes reorg (needs the design URL) → Slice 5 wrap. See the kickoff + the design-independent
  alternative above.
- 3 of 6 R1 phases done (1A/1B/1C); 1D in progress (Slices 0/A/B/C done, D partial, wrap remains).

## Exact Status (end of Session 25 — Phase 1D Slice C complete)
- **Phase 1D (Groceries): Slice 0 ✅ + A ✅ + B ✅ + Slice C ✅.** The shoppable list is built and
  machine-verified against the imported design. Features #7–10, #13, #16 met. Built: 7 grocery mutations
  (`editItem`/`splitItem`/`clearChecked`/`tidyItem` + `setOrganizeMode`/`reorderSections`/`reorderItems`), the
  optimistic `use-grocery-mutations` hook, the full UI (grouped↔manual toggle + `@dnd-kit` touch-first
  drag-reorder, inline merge-review, one-zone check-off + progress + banner, quick-add + dedupe, export), and
  GR1–GR7 E2E + grocery seed states. **248 unit + 37 E2E green**; lint + typecheck clean.
- **Next:** Slice D (staples + Talk-to-Chef + Recipes-tab reorg) — see the kickoff prompt above. Then Slice 5
  wrap (merge-quality eval on the real model + `/code-review` + `/visual-qa` on the new surfaces + doc pass +
  deploy).
- 3 of 6 R1 phases done (1A/1B/1C); 1D in progress (Slices 0/A/B/C done, D + wrap remain).



## Exact Status (end of Session 24 — Phase 1D Slice B complete)
- **Phase 1D (Groceries): Slice 0 ✅ + Slice A ✅ + Slice B ✅.** A confirmed plan now produces a merged,
  categorized grocery list end to end (the M4 mechanic). Built: the pure `aggregate.ts` under-merge core (22
  unit tests), the `ingredient-normalize` AI task + snapshot-tested prompt + E2E fixture, `grocery.generate`
  orchestration (idempotent CAS + checkpointed phases + transactional replace), `plan.confirm`→pending list,
  and the Groceries tab (poll + generating/ready/error + one-shot generate trigger). **224 unit green**; lint +
  typecheck clean.
- **Next:** Slice C (the shoppable list UI) — see the kickoff prompt above. Then Slice D (staples +
  Talk-to-Chef + Recipes-tab reorg) → wrap (E2E extend + merge-quality eval + code-review + visual-qa +
  deploy).
- 3 of 6 R1 phases done (1A/1B/1C); 1D in progress. R1 boundary = solo-user MVP (sharing/realtime/cook mode →
  V1.5). Post-MVP gate unchanged.

## Exact Status (end of Session 23 — Phase 1D Slice A complete)
- **Phase 1D (Groceries): Slice 0 ✅ + Slice A ✅.** The hydration spine is built + machine-verified:
  `plan.hydrateSlot` (`plan-hydrate.ts`, status-column CAS, conditional write-back, 8 unit tests), the
  `use-plan-hydration` walker (day-1-first, sequential, tap-to-prioritize, cache-patch, skips past days),
  card shimmer→ready, the extracted `RecipeView` + the meal-sheet writing→full→failed upgrade, the
  `recipe-generate` E2E fixture, and `recipe.get` resolved by rule. **185 unit + 30 Plan E2E green.**
- **Not yet committed at time of writing / or just committed** — see git log. **Not yet run on the real
  model:** hydration quality (generated recipe faithful to the concept) is a wrap-time real-gen check.
- **Next:** Slice B (list generation + the merge) — see the kickoff prompt above.
- 3 of 6 R1 phases done (1A/1B/1C); 1D in progress. R1 boundary = solo-user MVP (sharing/realtime/cook
  mode → V1.5). Post-MVP gate unchanged.

## Exact Status (end of Session 19 — 1C CLOSED, scope system stood up)
- **Phase 1C (Plan tab) is COMPLETE.** 3 of 6 phases done. All 13 scope-1C items met;
  Griffin's feedback pass done; the two AI-quality items (chips + week variety) **verified
  on the real model** S19 (real-gen check, 3 requests: 100% imperative chips, 7/7 distinct
  dish forms — the 7×-grilled-salad and attribute-chip problems are gone).
- **Release-level scope system stood up** (Griffin's visibility ask): `docs/scope-v1.md`
  is the Release 1 hub (phase spine 1A–1F, DoD, out-of-scope, post-MVP gate); `scope-1C.md`
  is its spoke. Session ritual v2 in CLAUDE.md: every session opens with a ≤6-line scope
  check linking scope-v1.md. Linear deferred with explicit graduation triggers (decisions.md).
  R1 boundary locked = **solo-user MVP** (sharing UI/realtime/cook mode → V1.5).
- **Restored 4 accidentally-deleted `~/.claude/plans/` files** (incl. meal-app + FFOS
  master plans); meal-app master plan reconciled with the R1-boundary note + committed.
- Green: 176/176 unit, 30/30 E2E. Both repos pushed to main (meal-app `e631714`).

## ⭐ Griffin's calls (carry-over)
1. **Optional:** enable the Playwright MCP (~10 min) so Claude can drive a live browser
   in-session for exploratory checks. Complements the harness — more useful now that 1D
   has no Figma mocks to work against.
2. **scope-v1.md open question:** small closed beta beyond Griffin + wife before R1 ship,
   or is two-user validation enough? (Decide during 1E.)

## Prior status (Session 17 — E2E harness Phase 1 + manual pass)
- **E2E harness built and green.** Playwright + server-side AI mock + auth bypass
  + DB seeding + a debug HUD. Plan-tab catalog now automated end to end except the
  low-risk G/R/W generate/review rows: D1-D7, RG1-RG5, M1-M7, **E1-E4 (elapsed),
  X1-X2 (error/retry)** → **30 passing, 0 findings**. Run `npm run test:e2e`.
- **A live manual pass (Session 17) caught two real bugs the harness had shipped
  past, both now fixed + committed + redeployed to prod:**
  - **D2 click-outside was dead in the browser** — the scrim inherited
    `pointer-events:none` from vaul's `modal={false}` portal. Fixed with
    `pointer-events-auto` on the scrim (`ui/drawer.tsx`). The harness's D2 test
    was green only because the fix landed in the same commit as the scaffold — so
    the harness *would* catch a regression, but the original prod bug reached
    users. Lesson: the harness didn't exist at Session 16 ship; now it guards this.
  - **No pointer cursor on any button** — Tailwind v4 dropped the default
    `cursor:pointer` on `<button>`. Fixed app-wide with a base rule + `cursor-grab`
    on the drawer handle (`globals.css`, `ui/drawer.tsx`).
- **Prod redeployed** (meal-app-swart.vercel.app) — was stuck on the Session 16
  build with the broken click-outside; now current.
- **What's left for you: the taste pass** (does the plan read well, do chips sound
  like imperatives, does it *feel* right). Mechanics are machine-verified.

*(S17's "Next session — feedback triage" brief executed in S18; the triage rules now
live in the session protocol + `docs/scope-1C.md`. D7 background-scroll: RESOLVED,
Griffin accepted scrollable background + click-outside; mobile touch-drag caveat —
confirm on-device when convenient.)*

## Prior status (Session 16, still relevant)
- **Phase**: Phase 1C (Plan Tab) — the design-led build pass is COMPLETE. All three Session 15 backlog items built (regenerate entry point, "AI is working" affordance, drawer dismissal), a high-effort dual review found + fixed 4 correctness bugs, and the gauntlet + production build are green (173/173 tests, +6 this session).
- **Session 16**: ux-design-critic designed the two app-wide patterns before building. Built: (1) regenerate/new-plan entry point via `intentMode` (re-prompts through the intent screen; no confirm dialog — the intent screen is the airlock) + a new elapsed-plan "week wrapped" state; (2) the in-place, scroll-independent AI-working affordance (MealCard `working`/`justChanged`, sheets stay open and close on success, bottom ack/error pills, optimistic `setData`, reusable `usePlanModify` hook, reachable error/retry); (3) drawer cleanup (shared X in `DrawerContent`, click-outside scrim that never touches body pointer-events, focus order). Dual review fixed: stale-modify-over-regenerate (token guard), removed-day highlight/scroll, global-pending-leaking-into-sheets (source scoping), stale pills over intent/streaming. Extracted `BottomBar`, removed dead `DrawerOverlay`.
- **Where the branch is**: `session-15-plan-fixes` — see "Branch / deploy" below for whether this session merged/pushed it.

## ⚠️ Manual verification Griffin still needs to run
No browser tool was available in Session 16, so the live UI was NOT click-tested (only lint/typecheck/tests/build/review). Run these in the app (dev server: `PORT=3001 npm run dev`, then the DevTools signin snippet):

1. **Test 8 — regenerate over an existing plan (the unblocked test).** With a plan present: draft → tap "Start over →"; confirmed → tap "Plan a new week →". Confirm it lands on the intent screen (pills + textarea), that a confirmed plan shows the "…will replace this week's meals" line, that "← Keep current plan" returns you, and that generating streams a NEW plan replacing the old one. Then confirm the old plan is gone (one-active-plan).
2. **Elapsed-plan state.** With a confirmed plan whose days are all in the past, confirm you get "That's a wrap on this week…" + thumbs recap + "Plan next week →" (not the old nonsensical mid-week view). Thumbs should still persist to chef memory.
3. **AI-working affordance on every modify path.** (a) inline card chip → the card dims + "Reworking {day}'s dinner…" + shimmer, then the new content lands with a highlight ring; (b) expanded-sheet action → sheet stays open showing pending, closes on success onto the changed card; (c) meal-scoped chat → same; (d) whole-week "Talk to the Chef" ("make this week lighter") → sheet pending, then a bottom pill with the chef's sentence that taps to scroll to the changed day. Confirm there is NO top-of-page toast anymore and no silent change.
4. **⭐ Drawer click-outside (highest-risk, un-click-tested).** Open each sheet (expanded + Talk-to-Chef) and tap the dimmed area outside it — it should close. Confirm this did NOT reintroduce the two-drawer pointer-events lockup (open a sheet, close via outside-tap, then tap a card — the card must still open). Also confirm the X still works and drag-to-dismiss still works. Note: background scroll while a sheet is open is now blocked by the scrim (accepted trade for click-outside — flag if you dislike it).
5. **Error path.** If you can force a modify failure (or just eyeball the code path): inline-chip failure → bottom "That didn't take — try again?" pill with Retry; sheet failure → the sheet stays open with the retry line.

## Branch / deploy — DONE this session
- **Merged + pushed**: `session-15-plan-fixes` → `main` (fast-forward), both on origin. This was the repo's FIRST push ever (needed `git config http.postBuffer 524288000` to get past an HTTP 400 on the large initial push).
- **Vercel**: the repo is git-connected and auto-deploys `main` → production. Correction to the old note: `OPENAI_API_KEY` (and all other prod env vars) were ALREADY set in Vercel Production (41 days ago) — the prerequisite was already met. Triggered a production deploy of Session 16 (`vercel deploy --prod`). The prior scaffold prod remains a rollback candidate. **Preview deploys lack `OPENAI_API_KEY`** (no Preview-scoped env var — only Development + Production), so branch previews have broken AI; set a Preview-scoped key if preview AI testing is wanted.
- Still owed: Griffin's manual test pass (Test 8 + affordance + click-outside) against the deployed prod URL or local.

## Known deviation
- `plan-page-client.tsx` is 330 lines (30 over the 300 rule). Every cohesive unit was already extracted; the rest is controller wiring + a render switch. Deliberately not split further (would mean a 20-prop presenter child). Overrule if you want it split.

## Key Files (Plan tab, post-Session-16)
- `src/components/plan/plan-page-client.tsx` — orchestrator (state + wiring + render switch)
- `src/components/plan/use-plan-modify.ts` — the AI-working affordance state machine (pending/changedDates/ack/error + token guard). Reusable by future tabs.
- `src/components/plan/meal-card.tsx` — `working`/`justChanged` props + `data-meal-date` scroll hook
- `src/components/plan/week-wrapped-state.tsx`, `past-meal-row.tsx`, `bottom-bar.tsx`, `modify-status-pills.tsx` — new
- `src/components/plan/expanded-meal-sheet.tsx`, `talk-to-chef-sheet.tsx` — sheets (stay open during modify)
- `src/components/ui/drawer.tsx` — shared X + click-outside scrim + focus order
- `src/app/api/plan/stream/route.ts` — streaming generation (replace-on-generate)
- `src/server/trpc/routers/plan.ts` — modify now returns `changedDates`
- `src/app/globals.css` — `.shimmer-bar` + `.animate-highlight-ring` keyframes

## Login on localhost (solved — don't rediscover)
- Google OAuth works on localhost:3001: Supabase Redirect URLs include it AND the proxy recognizes chunked cookies.
- If "sign-in loops back to /login" recurs: check cookie chunking first (`sb-*-auth-token.0/.1` vs the proxy regex in `src/lib/supabase/middleware.ts`).

## Development Workflow (established Session 8)
- Claude builds autonomously — don't stop for every change; check in when something cool is ready; only block on key product decisions.
- Codex QA / dual review at core milestones — mandatory. Run `/code-review` at the end of every build phase.
- Continuously ask "Is this how a senior engineer would build this?" Run the gauntlet (lint + typecheck + test + build) proactively.

## Open Questions Remaining
1. Free-form vs. structured list entry for Groceries (resolve during 1D)
2. AI-first preferences vs. static settings for You tab (resolve during 1E)
3. `recipe.get` returns `null` for missing recipes while `favorite`/`delete` throw NOT_FOUND — inconsistent; align during a 1D touch of the recipe router.
4. Working-label contextuality: currently day-level ("Reworking Tuesday's dinner…"). Verb-level ("Making it spicier…") was deferred as brittle; `workingLabel()` has a hook to enrich later if desired.
5. `scopedRequest` is a natural-language suffix, not a structural anchor — move to a structured `plan.modify` target if scoping proves unreliable.
