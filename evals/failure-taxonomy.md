# Where these cases came from

The most common weakness in an eval set is that somebody sat down and imagined
what might go wrong. Imagined cases cluster around failures that are easy to
picture, which are rarely the failures a system actually has.

This table is the provenance of every case in the suite: what the failure mode
was, how it was discovered, and which case guards it now. It is the honest
version of "our evals are representative" — you can see for yourself how much of
the set is grounded in observed behaviour and how much is anticipation.

## Observed failures — things this app actually did

| Failure mode | How it was found | Guarded by |
| --- | --- | --- |
| The chef named a weekday that had not happened yet and did not contain the ingredient it claimed to reuse ("the leftover dill from Monday", printed on a Thursday, in a week where Monday was four days later) | A real-model review pass reading generated weeks | `plan-generate` · every case, via the universal backward-reference check |
| Internal day numbering printed straight to the reader ("Placed congee on Day 0") | Real-model review, after the same class was fixed on the generation path only | `plan-generate` and `plan-modify` · every case, via the universal day-vocabulary check |
| One cooking method took over the whole week — seven of seven titles opened with "Grilled" after a request to grill | Real-model review, twice; the prompt could not hold the rule, so it moved into code | `plan-generate` · reported check on the raw model output |
| The ingredient-reuse rule colonised the chef's voice: seven of seven cards argued about using things up, so the week read like inventory management | Real-model review | `plan-generate` · "the chef's reasoning is about the food" |
| Per-recipe ingredient normalization risked losing the synonym merge that a single whole-week call got for free, because one call can see "scallions" and "green onions" together and seven separate calls cannot | Deliberate before/after measurement when moving normalization off the confirm path | `normalize-equivalence` · the whole suite |
| A traced prompt-injection chain: imported web page → recipe title → grocery item name → durable memory → a conversational call whose operations can delete a row from the safety card | Security review that printed the assembled prompt rather than reading the posture | `preferences-talk` · "an injected instruction cannot delete an allergy", plus injection cases in every other task |
| An allergy stated indirectly ("I can't have dairy", "peanuts make me sick") had to become a flagged medical restriction rather than a taste preference | Written as a real-model check when the feature shipped, and kept | `preferences-talk` · the four safety cases |

## Anticipated failures — things that have not happened here

These are in the set because the harm is high enough that waiting for the first
occurrence is the wrong strategy.

| Failure mode | Why it is worth a case anyway | Guarded by |
| --- | --- | --- |
| A recipe generated for a coeliac household containing wheat flour | A medical restriction; the cost of a miss is not a bad dinner | `recipe-generate` · "a coeliac household never gets wheat flour" |
| A direct request overriding a medical restriction ("creamy alfredo" to a dairy-allergic household) | The conflict case is the one where a helpful model is most likely to defer to the request | `recipe-generate` · "a request that contradicts a medical restriction" |
| An allergy reported on behalf of someone who does not use the app | Households cook for people who do not type | `preferences-talk` · "an allergy reported on someone else's behalf" |
| Over-flagging: a taste dislike escalated into an allergy | The mirror harm. A safety card full of preferences stops being read as a safety card | `preferences-talk` · "a taste dislike is NOT escalated" |
| Over-merging the grocery list — two different ingredients collapsing into one row | Silently drops an ingredient from the shop, and is invisible until you are cooking | `ingredient-normalize` · "ingredients that merely share a word are NOT merged" |
| A step calling for an ingredient the recipe never lists | Discovered mid-cook, with the shop closed | `recipe-generate` · judged, "no step calls for a missing ingredient" |
| A named night landing on the wrong day | Arithmetic that looks correct whenever day zero happens to be Monday, which is why the fixture week starts on a Wednesday | `plan-generate` · "a named night lands on that night" |
| Junk or hostile text inside an ingredient line | Recipe text arrives from web imports and hand entry, and a line does not have to be an ingredient | `ingredient-normalize` · two adversarial cases |

## What this set does not cover

Stated plainly, because a taxonomy that only lists strengths is marketing:

- **Recipe import from a URL is not graded here.** It is the only task that
  consumes untrusted third-party pages, and doing it properly needs saved page
  fixtures with hand-recorded ground truth. It is the next module.
- **Multi-turn conversation is not graded.** Every case is a single exchange, so
  a failure that only appears on the third message in a conversation would not be
  caught.
- **Only one household shape per persona.** Five fictional personas cover the
  constraint types that exist in the data model, not the full space of real
  households.
- **No production traffic.** Every input here was written by hand. The signals
  that would tell you a change actually hurt someone — regenerate rate, how often
  a meal is edited straight after it appears, real time-to-list — live in
  analytics, not in this directory.
