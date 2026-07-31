// Cross-domain pieces of the E2E AI mock: the `[E2E:*]` control-token parser
// and the prompt-block extractor every domain fixture parses its input with.
//
// Only ever reached when E2E_AI_MOCK is on (see ../e2e-mock.ts). Carries no
// secrets and never runs in production.

export interface MockDirectives {
  fail: boolean;
  slowMs: number | null;
}

// How many times each `[E2E:FAIL_ONCE=<key>]` key has been served a failure.
// Module-level and never reset: each spec uses its own key, and the E2E server
// is a fresh process per run.
const failOnceServed = new Map<string, number>();

// Test-only control tokens a spec can plant in a request string to force the
// error path or inject latency. Parsed from anywhere in the prompt text.
//
// `[E2E:FAIL_ONCE=<key>]` fails the FIRST call and succeeds on every one after.
// It exists for BUG-035's retry: a directive derived purely from prompt text
// cannot distinguish attempt 1 from attempt 2, since the retry re-sends the
// identical prompt — so proving "the first attempt died and the second one
// carried the user through" needs the mock to remember it has been asked.
export function parseMockDirectives(promptText: string): MockDirectives {
  const slowMatch = promptText.match(/\[E2E:SLOW=(\d+)\]/i);
  const slowMs = slowMatch ? Number(slowMatch[1]) : null;

  const onceMatch = promptText.match(/\[E2E:FAIL_ONCE=([\w-]+)\]/i);
  if (onceMatch) {
    const key = onceMatch[1].toLowerCase();
    const served = failOnceServed.get(key) ?? 0;
    failOnceServed.set(key, served + 1);
    return { fail: served === 0, slowMs };
  }

  return { fail: /\[E2E:FAIL\]/i.test(promptText), slowMs };
}

export function extractBlock(promptText: string, tag: string): string | null {
  const m = promptText.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : null;
}

export const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}
