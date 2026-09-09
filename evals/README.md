# Evals

This app's core features are model calls. Unit tests and browser tests can prove
the plumbing around those calls works; neither can tell you whether the model did
a good job. This directory is the third instrument: a set of cases that run
against the **real model** and grade what comes back.

It is small on purpose — five tasks, around fifty cases, under a dollar and about
ten minutes per run. The interesting part is not the count. It is which
properties are treated as non-negotiable, which are merely measured, and why the
difference is drawn where it is.

```
npm run eval          # real model, writes RESULTS.md + a snapshot of raw outputs
npm run eval:task     # same, filtered — e.g. -t "allergy" while iterating
npm run eval:mock     # the same cases against the E2E fixtures, free
npm run eval:report   # regenerate RESULTS.md from the last run
```

Latest numbers: [RESULTS.md](./RESULTS.md). Where the cases came from:
[failure-taxonomy.md](./failure-taxonomy.md).

---

## What is graded, and why those five

The product's promise is "I have no idea what to cook" to "my grocery list is
ready" in under ten minutes. The five tasks graded here are the ones that promise
sits on, plus the one that can cause real-world harm.

| Task | Why it is in the suite |
| --- | --- |
| `preferences-talk` | The only task that can **write to the safety card**. An allergy filed as a preference is a dish that gets cooked. |
| `plan-generate` | The front door. If the week is wrong, nothing downstream matters. |
| `plan-modify` | A second door to the same week, with its own prompt — and historically its own bugs. |
| `ingredient-normalize` | The second half of the north star. No normalization, no grocery list. |
| `recipe-generate` | The highest-volume call, and the one a person acts on physically. |

Recipe-import parsing is deliberately **not** here yet. It is the only task that
consumes untrusted third-party web pages, which means it needs saved page
fixtures and a different kind of case design; it is the obvious next module
rather than an omission.

## Cases are graded against the model, not against our own repair code

Every AI task in this app runs the same shape: a loose schema at the model
boundary, then a hand-written validator that repairs what comes back. The
validator renumbers recipe steps, drops duplicate days, splits the chef's
two-part voice, and strips a cooking method that opens four or more titles.

Each of those is a real guarantee. Each of them also makes the matching check
**incapable of failing** if you grade the finished object. "Steps are numbered
from one" is not a fact about the model; it is a fact about a `map` call.

So the plan cases capture two objects per run — the raw model output and the
validated one — and grade model quality against the raw. Checks whose subject is
our own code are still recorded, labelled `invariant`, and excluded from every
quality rate. They prove the pipeline ran. They are not evidence about the model,
and the report says so.

## Four kinds of check

**must-hold** — a binary, model-attributable property whose violation is a real
harm. An allergy dropped. A restriction broken. An injected instruction obeyed.
These are the only checks that can fail the suite.

**reported** — a genuine quality signal too noisy to gate on. Recorded as a pass
rate. A drop shows up as a number that moved rather than a red build.

**invariant** — a property our code guarantees, as described above.

**judged** — a subjective property graded by a second model. Advisory.

The split matters more than the total. Roughly four out of five checks here are
deterministic code reading structured output, which is the cheapest and most
reliable way to catch a regression. The judge is reserved for questions that
genuinely need reading comprehension: is this a week a person would actually
cook, could these steps be done in the stated time, is this recipe really
gluten-free once you account for soy sauce.

## Why there is no pass-rate threshold

The obvious design is a gate: fail the build if the pass rate drops below some
number a few points under the current baseline. That design is wrong here, and
the arithmetic is the reason.

A model is stochastic. Across roughly fifteen cases at three runs each, ordinary
sampling noise moves the observed rate by several points in either direction —
enough to cross any threshold set close enough to the baseline to be useful. The
result is a suite that goes red on an unchanged codebase more often than not,
which trains everyone to ignore it. A gate nobody trusts is worse than no gate.

So the rule is different: **a must-hold failure is re-run five more times, and
only a second failure fails the build.** One bad sample is a sample. Two is a
signal. Everything else is reported, and the report is what you read.

A failure that did **not** reproduce still appears in RESULTS.md, under its own
heading. A rare safety miss is worth seeing even when it is not worth blocking a
commit for.

## The judge is an instrument, so it is advisory until it is calibrated

The judge is a different model family from the one under test (Gemini grading
OpenAI) because a model grading its own output shares its blind spots. It answers
in binary, reasoning first, with thinking disabled — a 1-to-5 scale invites a 3
whenever the grader is unsure, and the gap between a 3 and a 4 is not stable
across runs.

None of that makes it correct. An uncalibrated judge is an unvalidated
measurement instrument, and reporting its scores as though they were findings
would be the same mistake as trusting a test that cannot fail.

So judged checks are recorded and never gate, and the standing rule is:

> Judged checks stay advisory until the judge clears **90% agreement in both
> directions** against human labels on a twenty-item audit. At that point they
> can gate.

The audit is a real task, not an aspiration: a sample of judged outputs is read
by hand, labelled pass/fail, and compared to the judge's verdicts. Until those
labels exist, this section stays exactly as it is — an unfilled calibration
section is more honest than a number nobody produced.

## What a run costs, and what it measures

Cost is **measured, not estimated**: the harness reads the token counts out of
the app's own AI logging and prices them at rates recorded in the report with the
date they were taken. A stale price is then visible rather than silent.

Runs are local. This repo has no paid CI, and running a real-model suite on every
push would spend money on every typo. The rule instead is that
`evals/RESULTS.md` is committed alongside the change that produced it — and a
free, offline test in the normal commit gauntlet fingerprints the prompt and task
sources and **fails if they have changed since the last recorded run**. That is
the only thing standing between "we have evals" and "we had evals".

## Offline here, online in production

Everything in this directory is an offline eval: fixed inputs, graded outputs, run
before shipping. It answers "did this change make the model worse", and nothing
else.

The questions it cannot answer are the ones production answers. The app already
emits a product analytics funnel and collects in-app feedback, which between them
carry the real signals: how often a generated week is regenerated rather than
confirmed, how often a person edits a meal immediately after it appears, how long
the north-star flow actually takes. Those are outcome metrics, and they are the
ones that would tell you a prompt change hurt.

The bridge worth building — and not yet built — is promoting one offline metric
to a production alarm: pick the check that best predicts a regenerate, watch it
on live traffic, and page on it. That is deliberately future work rather than
something claimed here, because a monitoring story is easy to write and hard to
mean.

## Why a hand-rolled harness instead of an eval framework

The first plan for this suite used [promptfoo](https://www.promptfoo.dev), which
is the recognisable choice and the one OpenAI points at now that its own evals
product is retired. Building against it was the right instinct and the wrong
answer for this codebase, for reasons worth writing down:

- **Nothing here is a prompt template.** Every input is a structured object built
  by app code. There is no `{{variable}}` to vary, so the framework's core
  feature — a matrix of prompts against a matrix of models — has nothing to act
  on.
- **Around four in five assertions call our own validators.** They would be
  custom JavaScript files referenced by path from YAML either way.
- **The report would be re-implemented regardless**, since the committed
  artifact is a Markdown document rather than a hosted dashboard.
- **It would have cost real dependency risk for that.** It requires a newer
  Node than this project's stated floor, and it pulls in its own copy of the
  Vercel AI SDK — the exact library whose model interface the E2E mock is built
  on.

What remained was a test runner, and this repo already has one. The harness is
about four hundred lines, adds **no new production dependencies** (the judge uses
the Google provider already in `package.json`), runs in the same tooling as
everything else, and puts each case's assertions next to the case instead of in a
different file in a different language.

The trade is real and worth naming: no hosted results viewer, no shared vocabulary
with other teams' eval suites, and the burden of having written the runner. For a
suite this size, that was the cheaper side.

## Layout

```
evals/
  cases/          one file per task; each case is a name, an input, and its checks
  harness/        the runner, the four check kinds, the judge, cost metering, the report
  fixtures/       fictional households and a seven-recipe week with hand-counted totals
  baseline/       committed raw outputs from the run RESULTS.md describes
  RESULTS.md      generated; committed
  freshness.test.ts   runs in the free gauntlet, fails when the prompts outrun the results
```
