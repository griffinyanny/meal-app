// Grocery "talk to the chef" fixture for the E2E AI mock (Phase 1D, Slice D).
// The doGenerate fixture for the `grocery-talk` task. Parses <current_list>
// (numbered "[N] name (category)" lines) and <request>, and returns deterministic
// ops + reply so a spec can drive add / query / remove without the network. The
// remove path echoes a real [N] from the list, exercising the router's ref→id
// resolution (the ID-safety path).
import { extractBlock } from "./shared";

export const GROCERY_TALK_TACO_ADDS = ["tortillas", "salsa", "cotija cheese"];
export const GROCERY_TALK_QUERY_REPLY =
  "You're low on eggs and milk — everything else looks stocked.";

interface TalkRefLine {
  ref: number;
  name: string;
}

function extractTalkList(promptText: string): TalkRefLine[] {
  const block = extractBlock(promptText, "current_list");
  if (!block) return [];
  const lines: TalkRefLine[] = [];
  const re = /\[(\d+)\]\s*([^(\n]+?)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    lines.push({ ref: Number(m[1]), name: m[2].trim() });
  }
  return lines;
}

function talkOp(
  kind: "add" | "remove",
  name = "",
  category = "other",
  qty = "",
  ref = 0
) {
  return { kind, name, category, qty, ref };
}

export function buildGroceryTalkFixture(promptText: string): {
  reply: string;
  ops: Array<{ kind: string; name: string; category: string; qty: string; ref: number }>;
} {
  const request = extractBlock(promptText, "request") ?? promptText;
  const list = extractTalkList(promptText);
  const lower = request.toLowerCase();

  // Remove: reference a listed item by its real [N] number.
  if (/\b(remove|delete|take off|drop)\b/.test(lower)) {
    const target = list.find((l) => lower.includes(l.name.toLowerCase()));
    return target
      ? { reply: `Removed ${target.name} from your list.`, ops: [talkOp("remove", "", "other", "", target.ref)] }
      : { reply: "I couldn't find that on your list.", ops: [] };
  }

  // Taco run: a fixed set of adds.
  if (/taco/.test(lower)) {
    return {
      reply: "Added tortillas, salsa, and cotija for taco night.",
      ops: GROCERY_TALK_TACO_ADDS.map((n) => talkOp("add", n)),
    };
  }

  // Query: no ops, just an answer.
  if (/\?|\bout of\b|what|on my list|do i have/.test(lower)) {
    return { reply: GROCERY_TALK_QUERY_REPLY, ops: [] };
  }

  // Generic add: "add <thing>" → add that thing.
  const addMatch = request.match(/add\s+(.+)/i);
  const thing = addMatch ? addMatch[1].trim().replace(/[.!]+$/, "") : "an item";
  return { reply: `Added ${thing}.`, ops: [talkOp("add", thing)] };
}
