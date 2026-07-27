// Cross-domain pieces of the E2E AI mock: the `[E2E:*]` control-token parser
// and the prompt-block extractor every domain fixture parses its input with.
//
// Only ever reached when E2E_AI_MOCK is on (see ../e2e-mock.ts). Carries no
// secrets and never runs in production.

export interface MockDirectives {
  fail: boolean;
  slowMs: number | null;
}

// Test-only control tokens a spec can plant in a request string to force the
// error path or inject latency. Parsed from anywhere in the prompt text.
export function parseMockDirectives(promptText: string): MockDirectives {
  const fail = /\[E2E:FAIL\]/i.test(promptText);
  const slowMatch = promptText.match(/\[E2E:SLOW=(\d+)\]/i);
  return { fail, slowMs: slowMatch ? Number(slowMatch[1]) : null };
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
