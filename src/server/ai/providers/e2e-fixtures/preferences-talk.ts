// Preferences "talk to the chef" fixture for the E2E AI mock (Phase 1E).
// doGenerate fixture for the `preferences-talk` task. Parses <message> and the
// numbered <what_i_remember> block and returns deterministic ops + reply so a
// spec can drive an allergy capture (add_avoid flag=true), a diet change, a
// cuisine add, a free-form memory write, and a forget (exercising the router's
// ref→id resolution) without the network. Every op carries all six keys.
import { capitalize, extractBlock } from "./shared";

const PREF_CUISINES = [
  "japanese", "korean", "italian", "indian", "french",
  "greek", "spanish", "vietnamese", "chinese", "mexican", "thai",
];

interface RememberRefLine {
  ref: number;
  content: string;
}

function extractRememberList(promptText: string): RememberRefLine[] {
  const block = extractBlock(promptText, "what_i_remember");
  if (!block) return [];
  const lines: RememberRefLine[] = [];
  const re = /\[(\d+)\]\s*(.+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    lines.push({ ref: Number(m[1]), content: m[2].trim() });
  }
  return lines;
}

function prefOp(
  kind: string,
  extras: {
    value?: string;
    flag?: boolean;
    amount?: number;
    ref?: number;
    category?: string;
    adults?: number;
    children?: number;
    babies?: number;
  } = {}
) {
  return {
    kind,
    value: extras.value ?? "",
    flag: extras.flag ?? false,
    amount: extras.amount ?? 0,
    ref: extras.ref ?? 0,
    category: extras.category ?? "preference",
    // BUG-011 · every op carries the household bands, matching the real schema
    // (see the note on aiPreferencesTalkOpSchema). The defaults are OUT OF
    // RANGE on purpose: they clamp to null in `coercePreferencesTalk`, so an
    // unrelated op arrives naming no band rather than silently claiming one.
    adults: extras.adults ?? 0,
    children: extras.children ?? -1,
    babies: extras.babies ?? -1,
  };
}

export function buildPreferencesTalkFixture(promptText: string): {
  reply: string;
  ops: Array<{
    kind: string;
    value: string;
    flag: boolean;
    amount: number;
    ref: number;
    category: string;
    adults: number;
    children: number;
    babies: number;
  }>;
} {
  const message = extractBlock(promptText, "message") ?? promptText;
  const lower = message.toLowerCase();
  const memories = extractRememberList(promptText);

  // Taking an avoid back — checked BEFORE the allergy branch, because a
  // retraction ("actually remove peanuts", "I'm not allergic to peanuts after
  // all") usually still contains the word it is retracting. The real model
  // emits remove_avoid here; without this branch the mock could only ever add,
  // which would make the suite green over a chef that never lets go of a
  // restriction the user withdrew.
  const removeMatch = lower.match(
    /(?:remove|drop|take off|forget about|no longer avoid)\s+(?:the\s+)?([a-z ]+)|not allergic to\s+([a-z ]+)/
  );
  if (removeMatch) {
    const food = (removeMatch[1] ?? removeMatch[2] ?? "").split(/[.,]/)[0].trim();
    if (food) {
      return {
        reply: `Taken ${food} off your list.`,
        ops: [prefOp("remove_avoid", { value: food })],
      };
    }
  }

  // BUG-011 · the household, in BANDS. The real model is told to prefer bands
  // and fall back to a bare total only when the message gives no breakdown, so
  // the mock has to be able to produce both — a fixture that only ever emitted
  // a total would make the suite green over a chef that can't hear "two adults
  // and two kids".
  const adultsMatch = lower.match(/(\d+)\s+adults?/);
  const childrenMatch = lower.match(/(\d+)\s+(?:children|kids?)/);
  const babiesMatch = lower.match(/(\d+)\s+(?:bab(?:y|ies))/);
  if (adultsMatch || childrenMatch || babiesMatch) {
    return {
      reply: "Got it, I've updated who I'm cooking for.",
      ops: [
        prefOp("set_household", {
          ...(adultsMatch ? { adults: Number(adultsMatch[1]) } : {}),
          ...(childrenMatch ? { children: Number(childrenMatch[1]) } : {}),
          ...(babiesMatch ? { babies: Number(babiesMatch[1]) } : {}),
        }),
      ],
    };
  }

  // The bare head count, with no bands in it at all.
  const totalMatch = lower.match(
    /(?:we(?:'re| are)|there(?:'s| are| is)|family of)\s+(\d+)(?:\s+(?:people|now|of us))?/
  );
  if (totalMatch) {
    return {
      reply: "Got it, I've updated who I'm cooking for.",
      ops: [prefOp("set_household", { amount: Number(totalMatch[1]) })],
    };
  }

  // Allergy — highest priority, ALWAYS a flagged avoid (never a dislike).
  const allergyMatch = lower.match(/allerg(?:ic to|y to|ic|y|ies)?\s+([a-z ]+)/);
  if (/\ballerg/.test(lower)) {
    const food = (allergyMatch?.[1] ?? "").split(/[.,]/)[0].trim() || "it";
    return {
      reply: `Noted the ${food} allergy — I'll never cook with it.`,
      ops: [prefOp("add_avoid", { value: food, flag: true })],
    };
  }

  // Dropping a dietary framework with no replacement named → omnivore.
  if (/not (a )?(pescatarian|vegetarian|vegan|keto|paleo)/.test(lower)) {
    return {
      reply: "Updated your diet to omnivore.",
      ops: [prefOp("set_diet", { value: "omnivore" })],
    };
  }
  if (/go(ing)? vegan|vegan now/.test(lower)) {
    return { reply: "Switched you to vegan.", ops: [prefOp("set_diet", { value: "vegan" })] };
  }

  // Add any cuisine named in the message.
  const named = PREF_CUISINES.filter((c) => lower.includes(c));
  if (named.length > 0 && /add|love|like|lean|into/.test(lower)) {
    return {
      reply: `Added ${named.map(capitalize).join(" and ")} to your cuisines.`,
      ops: named.map((c) => prefOp("add_cuisine", { value: capitalize(c) })),
    };
  }

  // "Actually I do like X" → forget the memory that mentions X.
  const likeMatch = lower.match(/do like (\w+)|actually.*\blike (\w+)/);
  if (likeMatch) {
    const term = (likeMatch[1] ?? likeMatch[2] ?? "").trim();
    const target = memories.find((m) => m.content.toLowerCase().includes(term));
    if (target) {
      return {
        reply: `Good to know — I'll cook with ${term} again.`,
        ops: [prefOp("forget", { ref: target.ref })],
      };
    }
  }

  // Default: file it as a free-form memory.
  return {
    reply: "Got it — I'll remember that.",
    ops: [prefOp("remember", { value: message.trim(), category: "preference" })],
  };
}
