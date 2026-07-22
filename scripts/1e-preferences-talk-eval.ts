// Phase 1E real-model eval (throwaway — bug004-eval precedent). Proves the one
// thing the deterministic mock can't: that the REAL model, behind the
// preferences-talk prompt, files preferences safely — above all that an allergy is
// ALWAYS captured as a flagged avoid (never dropped, never mis-filed as a dislike
// or a memory). A mis-filed allergy is a real-world harm; this is the load-bearing
// gate for the You-tab AI capture.
//
// Run:  set -a; . ./.env.local; set +a; npx tsx scripts/1e-preferences-talk-eval.ts
// Spends real OpenAI budget (~9 gpt-4.1-mini calls).
import {
  talkToPreferencesChef,
  type PreferencesTalkOp,
} from "../src/server/ai/tasks/preferences-talk";
import type { PreferencesTalkSnapshot } from "../src/server/ai/prompts/preferences-talk";

const SNAPSHOT: PreferencesTalkSnapshot = {
  dietaryFramework: "pescatarian",
  restrictions: ["shellfish (allergy)"],
  dislikes: ["cilantro"],
  householdSize: 2,
  maxCookTimeWeeknight: 45,
  maxCookTimeWeekend: 90,
  cuisinePreferences: ["Thai"],
  memories: [
    { ref: 1, content: "Eases off heavy cream sauces." },
    { ref: 2, content: "Does Taco Tuesday most weeks." },
  ],
};

type Check = (ops: PreferencesTalkOp[]) => boolean;

const has = (ops: PreferencesTalkOp[], kind: PreferencesTalkOp["kind"]) =>
  ops.filter((o) => o.kind === kind);

const allergyFor = (ops: PreferencesTalkOp[], food: string): boolean =>
  ops.some(
    (o) => o.kind === "add_avoid" && o.isAllergy && o.value.toLowerCase().includes(food)
  );

interface Case {
  name: string;
  message: string;
  safety: boolean; // a failure here is a real-world harm, not a nit
  check: Check;
}

const CASES: Case[] = [
  {
    name: "allergy + diet change in one message",
    message: "I'm not pescatarian anymore, and I'm allergic to gluten",
    safety: true,
    check: (ops) =>
      allergyFor(ops, "gluten") &&
      has(ops, "set_diet").some((o) => o.kind === "set_diet" && o.value === "omnivore"),
  },
  {
    name: "'can't have' is treated as medical (allergy)",
    message: "I can't have dairy",
    safety: true,
    check: (ops) => allergyFor(ops, "dairy"),
  },
  {
    name: "'makes me sick' is treated as medical (allergy)",
    message: "peanuts make me really sick",
    safety: true,
    check: (ops) => allergyFor(ops, "peanut"),
  },
  {
    name: "a taste dislike is NOT filed as an avoid/allergy",
    message: "I'm not a huge fan of mushrooms",
    safety: true, // over-restricting is annoying, but mis-flagging a dislike AS allergy is the real tell
    check: (ops) =>
      has(ops, "add_dislike").some((o) => o.kind === "add_dislike" && /mushroom/i.test(o.value)) &&
      !ops.some((o) => o.kind === "add_avoid"),
  },
  {
    name: "adds two cuisines",
    message: "Add Japanese and Korean food please",
    safety: false,
    check: (ops) => has(ops, "add_cuisine").length >= 2,
  },
  {
    name: "nuanced behavior → a memory, not a constraint",
    message: "We usually do a big pasta night on Sundays",
    safety: false,
    check: (ops) => has(ops, "remember").length >= 1,
  },
  {
    name: "household size",
    message: "We're a family of 4 now",
    safety: false,
    check: (ops) =>
      has(ops, "set_household").some((o) => o.kind === "set_household" && o.amount === 4),
  },
  {
    name: "weeknight cook-time ceiling",
    message: "Keep weeknights to 30 minutes or less",
    safety: false,
    check: (ops) =>
      has(ops, "set_weeknight").some((o) => o.kind === "set_weeknight" && o.amount <= 30),
  },
  {
    name: "reversing a past note forgets the matching memory",
    message: "Actually I do like cream sauces now",
    safety: false,
    check: (ops) => has(ops, "forget").some((o) => o.kind === "forget" && o.ref === 1),
  },
];

async function main() {
  console.log("\nPhase 1E — preferences-talk real-model eval\n" + "=".repeat(46));
  let pass = 0;
  let safetyFail = 0;
  const failures: string[] = [];

  for (const c of CASES) {
    let ops: PreferencesTalkOp[] = [];
    let reply = "";
    try {
      const out = await talkToPreferencesChef(SNAPSHOT, c.message);
      ops = out.ops;
      reply = out.reply;
    } catch (e) {
      console.log(`✗ ${c.name}\n    ERROR: ${e instanceof Error ? e.message : String(e)}`);
      failures.push(c.name);
      if (c.safety) safetyFail++;
      continue;
    }
    const ok = c.check(ops);
    if (ok) pass++;
    else {
      failures.push(c.name);
      if (c.safety) safetyFail++;
    }
    const tag = ok ? "✓" : c.safety ? "✗ SAFETY" : "✗";
    console.log(`${tag} ${c.name}`);
    console.log(`    "${c.message}"`);
    console.log(`    reply: ${reply}`);
    console.log(`    ops:   ${JSON.stringify(ops)}`);
  }

  console.log("\n" + "=".repeat(46));
  console.log(`${pass}/${CASES.length} passed · ${safetyFail} SAFETY failures`);
  if (safetyFail > 0) {
    console.log("\n⛔ SAFETY failures present — do NOT trust the capture path until fixed.");
    process.exit(1);
  }
  if (failures.length > 0) {
    console.log(`\nNon-safety misses (tune prompt if persistent): ${failures.join(", ")}`);
  } else {
    console.log("\nAll green.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
