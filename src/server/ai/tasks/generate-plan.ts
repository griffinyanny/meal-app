import {
  buildPlanSystemPrompt,
  buildUserContext,
} from "@/server/ai/prompts/chef-system";
import { fence } from "@/server/ai/prompts/fence";
import { aiPlanSchema } from "./plan-types";
import { buildPicksBlock, type PickInput } from "./plan-picks";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * The day map — which weekday each dayOffset actually is.
 *
 * S40 caught the model printing "reusing olive oil from day 0" onto a card and
 * fixed it by telling the prompt to use WEEKDAY NAMES instead. But nothing ever
 * told the model what the weekdays WERE, so it did the only thing it could: it
 * mapped dayOffset onto a Monday-start week and wrote "Tuesday" for offset 1.
 * On a week starting Wednesday that is wrong on every single day, and S45's
 * Layer B caught two cards doing it ("Brighten Tuesday" printed on a Thursday;
 * "leftover parsley from Tuesday" when the parsley was Thursday's).
 *
 * That made the S40 fix a downgrade rather than a repair: "day 0" LOOKS like a
 * bug and gets reported, "Tuesday" looks correct and quietly misinforms. The
 * model was never disobeying — it was guessing, because we asked it for a fact
 * we withheld. Stating the map is the actual fix; the constraint in the system
 * prompt only became satisfiable once this existed.
 */
// Exported for the MODIFY path too. S45 fixed this for generation and never
// asked whether modify had the same hole — it did, and S47's Layer B caught the
// chef writing "Placed Congee … on Day 0" and "This dish fits perfectly on Day
// 1" straight to the user. Same defect, second door.
export function buildDayMap(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const lines = Array.from({ length: 7 }, (_, offset) => {
    // Noon UTC: the date is a calendar day, and midnight would let a negative
    // local offset roll it back to the previous weekday.
    const day = new Date(Date.UTC(y, m - 1, d, 12));
    day.setUTCDate(day.getUTCDate() + offset);
    const name = WEEKDAYS[day.getUTCDay()];
    const month = day.toLocaleDateString("en-US", {
      month: "long",
      timeZone: "UTC",
    });
    return `- dayOffset ${offset} is ${name}, ${month} ${day.getUTCDate()}`;
  });
  return `This week's days (use these names whenever you name a day — the week does NOT start on Monday):\n${lines.join("\n")}`;
}

export interface PlanGenerationInput {
  /** ISO YYYY-MM-DD of dayOffset 0. Required: without it the model guesses. */
  weekStart: string;
  request?: string;
  /** W8 · library recipes the person chose. A constraint, never a schedule. */
  picks?: PickInput[];
  dietaryFramework?: string;
  restrictions?: string[];
  dislikedFoods?: string[];
  householdSize?: number;
  maxCookTimeMinutes?: number;
  memories?: string[];
}

// Builds the params for a streamed plan generation. The route handler feeds
// these into generateStream(); user-supplied intent stays in the user message,
// wrapped in <user_request>, never in the static system prompt.
export function buildPlanStreamParams(input: PlanGenerationInput) {
  const context = buildUserContext({
    dietaryFramework: input.dietaryFramework,
    restrictions: input.restrictions,
    dislikedFoods: input.dislikedFoods,
    householdSize: input.householdSize,
    maxCookTimeMinutes: input.maxCookTimeMinutes,
    memories: input.memories,
  });

  const request = input.request?.trim();
  const intent = request
    ? `${fence("user_request", request)}\n\nPlan the week of dinners around this request.`
    : `The person didn't give specific direction — surprise them with a great week of dinners based on what you know about them.`;

  // The day map goes in the USER message, not the system prompt: it is per-week
  // data, and buildPlanSystemPrompt() is asserted static (no interpolation).
  const dayMap = buildDayMap(input.weekStart);

  // Picks go BELOW the request and ABOVE the instruction to plan, because they
  // are the strongest constraint in the message and the last thing read before
  // the ask carries the most weight. Same reason the day map sits where it does.
  const picks = buildPicksBlock(input.picks ?? [], input.householdSize);

  return {
    task: "plan-generate" as const,
    system: buildPlanSystemPrompt(),
    prompt: [context, dayMap, picks, intent].filter(Boolean).join("\n\n"),
    schema: aiPlanSchema,
  };
}
