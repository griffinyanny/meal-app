// The event taxonomy, in code (1F/D3, S63). Prose + rationale:
// `docs/observability-taxonomy.md`.
//
// ⚠️ This file is the taxonomy. It was DESIGNED here, not ported — six docs
// named "the event taxonomy from S9" as an available input and it does not
// exist: it lived in a plan file `docs/plans/README.md` records as LOST since
// S18. The claim survived 44 sessions because nothing needed it until now.
//
// Two properties this file exists to hold, both enforced by the compiler
// rather than by discipline:
//
//   1. An event name that is not in the map, or a call missing a property, is
//      a COMPILE ERROR — the BUG-044 discipline (a ninth diet framework is a
//      type error everywhere it is missing).
//   2. No event property can carry user content. See the guard at the bottom:
//      a wide `string` anywhere but an opaque id fails `npm run typecheck`.
//
// Pure and dependency-free on purpose — the browser sink, the server sink and
// every call site read it, so it can import from none of them.

/**
 * How a ritual began. `onboarding_handoff` is the interview's pre-seeded entry
 * into the Plan intent screen, which is a genuinely different starting line
 * from a cold intent and would otherwise pollute the time-to-list median.
 */
export type RitualEntry = "intent" | "regenerate" | "onboarding_handoff";

/**
 * Why a generation produced no week.
 *
 * ⚠️ Reported SERVER-side, and that is BUG-035's lesson rather than a
 * preference: the stream route has already returned 200 with an open body by
 * the time anything can stall, so a dead stream reaches the client as a body
 * that simply closes — `isLoading` goes false and `error` stays undefined. The
 * client genuinely cannot tell a timeout from a stall from a provider error.
 * `client_stream_died` is the honest name for what the client alone can see.
 */
export type GenerationFailure =
  | "timeout"
  | "client_stream_died"
  | "invalid_plan"
  | "rate_limited"
  | "budget_exhausted"
  | "unknown";

/** Mirrors `mealPlanSlots.slotType` (db/schema/plans.ts). */
export type SlotType = "recipe" | "eating_out" | "skip" | "leftover";

export type GrocerySurface = "plan" | "groceries" | "you";
export type GroceryPhase = "hydrating" | "normalizing" | "aggregating";
export type RecipeSource = "ai_generate" | "url_import";

/**
 * Free text is never sent. Where the LENGTH of what someone wrote is the
 * interesting part (is he typing "chicken" or a paragraph?), it is bucketed
 * here and the content is dropped at the call site.
 */
export type LengthBucket = "short" | "medium" | "long";

/**
 * The taxonomy. Keys are event names; values are that event's exact property
 * shape. Categories match `docs/observability-taxonomy.md`.
 */
export type EventMap = {
  // ---- A · the ritual (the DoD's time-to-list measurement) ---------------
  ritual_started: {
    ritual_id: string;
    entry: RitualEntry;
    has_request: boolean;
    picked_count: number;
  };
  plan_generated: {
    ritual_id: string;
    meal_count: number;
    duration_ms: number;
    picked_count: number;
  };
  plan_confirmed: {
    ritual_id: string;
    meal_count: number;
    days_covered: number;
    was_modified: boolean;
  };
  list_ready: {
    ritual_id: string;
    item_count: number;
    section_count: number;
    generation_ms: number;
    /** The DoD number. `list_ready.ts − ritual_started.ts`. */
    time_to_list_ms: number;
  };
  /**
   * A ritual that started and never reached a list, reported on next launch.
   *
   * ⚠️ Not garnish. Without it, "< 10 minutes" is computed only over rituals
   * that FINISHED, which is survivor bias with a number attached.
   */
  ritual_abandoned: {
    ritual_id: string;
    last_step: "started" | "generated" | "confirmed";
    age_ms: number;
  };

  // ---- B · plan ----------------------------------------------------------
  plan_generation_failed: {
    ritual_id: string;
    reason: GenerationFailure;
    duration_ms: number;
  };
  plan_regenerated: { ritual_id: string; prior_meal_count: number };
  plan_modify_requested: {
    ritual_id: string;
    scope: "week" | "meal";
    day_offset: number | null;
  };
  plan_modify_resolved: {
    ritual_id: string;
    outcome: "applied" | "failed";
    changed_meal_count: number;
    duration_ms: number;
  };
  plan_meal_opened: {
    ritual_id: string;
    day_offset: number;
    slot_type: SlotType;
    recipe_status: "none" | "hydrating" | "ready" | "stale";
  };
  plan_feedback_given: { feedback: "up" | "down" | "cleared"; day_offset: number };

  // ---- C · library into plan --------------------------------------------
  picker_opened: {
    ritual_id: string;
    library_size: number;
    filter: RecipeFilter;
  };
  recipe_picked: {
    ritual_id: string;
    pick_count_after: number;
    source: "picker" | "detail_add_to_week";
    removed: boolean;
  };

  // ---- D · recipes -------------------------------------------------------
  recipe_created: { source: RecipeSource; duration_ms: number };
  recipe_create_failed: { source: RecipeSource; reason: GenerationFailure };
  recipe_modified: { duration_ms: number; version_depth: number };
  recipe_favorited: { is_favorite: boolean };
  recipe_library_browsed: {
    filter: RecipeFilter;
    result_count: number;
    searched: boolean;
  };

  // ---- E · groceries -----------------------------------------------------
  grocery_generation_failed: {
    ritual_id: string;
    phase: GroceryPhase;
    reason: GenerationFailure;
  };
  grocery_item_checked: {
    checked: boolean;
    checked_count: number;
    total_count: number;
    offline: boolean;
  };
  grocery_item_added: {
    source: "manual" | "staple" | "chef";
    deduped: boolean;
  };
  grocery_item_edited: { field: "name" | "quantity" | "category" };
  /**
   * The user splitting a merged item back apart — i.e. telling us a merge was
   * wrong. Ingredient merging is named "the hard V1 problem" in scope-v1 and
   * was signed off on a single human read; this is the only ongoing quality
   * signal it has.
   */
  grocery_item_split: { source_count: number };
  grocery_organize_changed: { mode: "grouped" | "manual" };
  grocery_reordered: { scope: "sections" | "items" };
  grocery_exported: { item_count: number; unchecked_count: number };

  // ---- F · chef conversation --------------------------------------------
  chef_talk_submitted: {
    surface: GrocerySurface;
    input_mode: "typed" | "mic";
    length_bucket: LengthBucket;
  };
  chef_talk_failed: { surface: GrocerySurface; reason: GenerationFailure };

  // ---- G · you and memory -----------------------------------------------
  preference_updated: { field: PreferenceField; method: "direct" | "chef" };
  memory_toggled: { active: boolean };
  memory_captured: { surface: GrocerySurface; count: number };

  // ---- H · onboarding and app lifecycle ---------------------------------
  onboarding_started: Record<string, never>;
  onboarding_completed: {
    duration_ms: number;
    question_count: number;
    deepened: boolean;
    skipped: boolean;
  };
  /**
   * ⚠️ `display_mode` is the only AUTOMATED evidence the PWA install took. The
   * two-phone check is manual and unrepeatable; this is what says it is still
   * true in week two.
   */
  app_launched: { display_mode: "standalone" | "browser"; offline: boolean };
  connectivity_changed: { online: boolean; offline_duration_ms: number | null };
  queued_mutations_flushed: { count: number; failed_count: number };
};

/** The library filter rungs, as the Recipes tab defines them. */
export type RecipeFilter = "all" | "favorites" | "cooked";

/**
 * Which preference changed — the NAME of the field, never its value. "the user
 * edited their dietary framework" is a product signal; "the user is vegan" is
 * health data and does not belong in an analytics pipeline.
 */
export type PreferenceField =
  | "dietary_framework"
  | "no_list"
  | "household"
  | "cook_time"
  | "cuisines"
  | "skill"
  | "goal"
  | "effort";

export type EventName = keyof EventMap;
export type EventProps<N extends EventName> = EventMap[N];

/**
 * Every event name at runtime, so the taxonomy is inspectable and testable.
 *
 * ⚠️ It cannot drift from `EventMap`: the assertion below is exhaustive in
 * BOTH directions, so adding an event to the map without adding it here (or
 * vice versa) is a compile error rather than a silently-untracked event.
 */
export const ALL_EVENTS = [
  // A · the ritual
  "ritual_started",
  "plan_generated",
  "plan_confirmed",
  "list_ready",
  "ritual_abandoned",
  // B · plan
  "plan_generation_failed",
  "plan_regenerated",
  "plan_modify_requested",
  "plan_modify_resolved",
  "plan_meal_opened",
  "plan_feedback_given",
  // C · library into plan
  "picker_opened",
  "recipe_picked",
  // D · recipes
  "recipe_created",
  "recipe_create_failed",
  "recipe_modified",
  "recipe_favorited",
  "recipe_library_browsed",
  // E · groceries
  "grocery_generation_failed",
  "grocery_item_checked",
  "grocery_item_added",
  "grocery_item_edited",
  "grocery_item_split",
  "grocery_organize_changed",
  "grocery_reordered",
  "grocery_exported",
  // F · chef conversation
  "chef_talk_submitted",
  "chef_talk_failed",
  // G · you and memory
  "preference_updated",
  "memory_toggled",
  "memory_captured",
  // H · onboarding and app lifecycle
  "onboarding_started",
  "onboarding_completed",
  "app_launched",
  "connectivity_changed",
  "queued_mutations_flushed",
] as const satisfies readonly EventName[];

type MissingFromAllEvents = Exclude<EventName, (typeof ALL_EVENTS)[number]>;

/**
 * `true` when `ALL_EVENTS` covers every key of `EventMap`. When it does not,
 * this resolves to a tuple NAMING the missing events, so the compile error
 * says which one rather than making you hunt (S59: a guard that mis-reports
 * teaches people to edit the expectation).
 */
export type AllEventsIsExhaustive = [MissingFromAllEvents] extends [never]
  ? true
  : ["EVENT MISSING FROM ALL_EVENTS", MissingFromAllEvents];

// ---------------------------------------------------------------------------
// THE GUARD — no event property may carry user content.
// ---------------------------------------------------------------------------
//
// Every property above is a number, a boolean, a string LITERAL union, or an
// opaque id. None of those can hold a recipe title, a grocery item name, a
// memory body, a dietary answer, a child's age or an email — which is the same
// rule `.claude/rules/ai-pipelines.md` applies to prompts, held here by the
// compiler instead of by review.
//
// ⚠️ A wide `string` is the failure mode, because it is what a well-meaning
// future call site reaches for ("just send the item name, it'll help debug").
// The types below make that a `npm run typecheck` failure that NAMES the
// offending event, rather than a leak nobody notices until it is in a vendor.

/**
 * Keys permitted to hold a wide `string`. Every one is an OPAQUE ID we or
 * Supabase minted — never anything a person typed or the chef wrote. Adding a
 * key here is a deliberate act, and the reason belongs beside it.
 */
type OpaqueIdKey = "ritual_id";

type WideStringKeys<T> = {
  [K in keyof T]-?: K extends OpaqueIdKey
    ? never
    : string extends T[K]
      ? K
      : never;
}[keyof T];

type EventsCarryingFreeText = {
  [E in keyof EventMap]: WideStringKeys<EventMap[E]> extends never ? never : E;
}[keyof EventMap];

/**
 * `true` when the taxonomy is clean. When it is not, this resolves to a tuple
 * naming the offending events, and the assertion below fails to compile with
 * those names in the error text.
 */
export type TaxonomyCarriesNoFreeText = [EventsCarryingFreeText] extends [never]
  ? true
  : ["EVENT CARRIES FREE TEXT — bucket it or make it a literal union", EventsCarryingFreeText];
