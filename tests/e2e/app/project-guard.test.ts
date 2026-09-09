import { describe, it, expect } from "vitest";
import {
  ALLOWED_PROJECT_REF_HASHES,
  assertAllowedProject,
  hashProjectRef,
  refFromDatabaseUrl,
  refFromSupabaseUrl,
} from "./project-guard";

// ⚠️ A SYNTHETIC ref, and the allow-list is INJECTED (S70). The committed list
// holds hashes rather than refs, so the real one is not derivable here — which
// is the point of hashing it. The guard's LOGIC is what these assertions are
// about, and it is identical either way: the happy path passes a list built
// from this ref's own hash, exactly as production passes the committed list.
const REF = "bbbbbbbbbbbbbbbbbbbb";
const ALLOWED = [hashProjectRef(REF)];
const API_URL = `https://${REF}.supabase.co`;
const POOLED_DB_URL = `postgresql://postgres.${REF}:pw@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;
const DIRECT_DB_URL = `postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`;

const OTHER = "aaaaaaaaaaaaaaaaaaaa";

describe("refFromSupabaseUrl", () => {
  it("should read the project ref out of the API host", () => {
    expect(refFromSupabaseUrl(API_URL)).toBe(REF);
  });

  it("should return null for a host that is not a Supabase project", () => {
    expect(refFromSupabaseUrl("https://example.com")).toBeNull();
  });
});

describe("refFromDatabaseUrl", () => {
  it("should read the ref off the username in a pooler connection string", () => {
    expect(refFromDatabaseUrl(POOLED_DB_URL)).toBe(REF);
  });

  it("should read the ref out of the host in a direct connection string", () => {
    expect(refFromDatabaseUrl(DIRECT_DB_URL)).toBe(REF);
  });

  it("should return null for a Postgres URL that names no Supabase project", () => {
    expect(refFromDatabaseUrl("postgresql://postgres:pw@localhost:5432/postgres")).toBeNull();
  });

  // An unencoded `@` in the password does NOT throw — WHATWG URL splits on the
  // LAST `@`, so it parses to a plausible-looking username and host that happen
  // to match neither shape. Named accurately because the first version of this
  // test claimed the string "will not parse", which is not what happens and
  // would have sent the next reader looking in the wrong place.
  it("should return null when an odd password shifts the parse to an unrecognisable shape", () => {
    expect(refFromDatabaseUrl("postgresql://postgres:p@ss@host/db")).toBeNull();
  });

  it("should return null rather than throw when the string is not a URL at all", () => {
    expect(refFromDatabaseUrl("not a url")).toBeNull();
  });
});

// ⚠️ The failure mode hashing introduces: a mistyped hash refuses the real
// project, and the only place that surfaces is an E2E run refusing to start.
// These assert the SHAPE of the committed list, which is all that can be
// checked without the plaintext ref — the value itself is verified by the
// harness booting at all.
describe("ALLOWED_PROJECT_REF_HASHES", () => {
  it("should not be empty, since an empty list refuses every project", () => {
    expect(ALLOWED_PROJECT_REF_HASHES.length).toBeGreaterThan(0);
  });

  it("should hold only lowercase sha256 hex digests", () => {
    for (const h of ALLOWED_PROJECT_REF_HASHES) {
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("should not hold a raw project ref by mistake", () => {
    for (const h of ALLOWED_PROJECT_REF_HASHES) {
      expect(h).not.toMatch(/^[a-z]{20}$/);
    }
  });
});

describe("assertAllowedProject", () => {
  it("should permit the project the harness is actually configured for", () => {
    expect(() => assertAllowedProject(API_URL, POOLED_DB_URL, ALLOWED)).not.toThrow();
  });

  // The bug itself: a .env.local carrying someone else's project. The sentinel
  // household name cannot catch this — a real household could carry that name,
  // and BUG-018 was filed precisely because nothing checked the URL.
  it("should refuse a project that is not in the allow-list", () => {
    expect(() =>
      assertAllowedProject(
        `https://${OTHER}.supabase.co`,
        `postgresql://postgres.${OTHER}:pw@aws-1-us-east-1.pooler.supabase.com:6543/postgres`,
        ALLOWED
      )
    ).toThrow(/not in the harness allow-list/);
  });

  // The worst shape of a half-edited file: the app would talk to one project
  // while the seeder deleted rows in another.
  it("should refuse when the two URLs name different projects", () => {
    expect(() =>
      assertAllowedProject(
        API_URL,
        `postgresql://postgres.${OTHER}:pw@aws-1-us-east-1.pooler.supabase.com:6543/postgres`,
        ALLOWED
      )
    ).toThrow(/but DATABASE_URL names/);
  });

  it("should refuse rather than proceed when a ref cannot be read at all", () => {
    expect(() => assertAllowedProject("https://example.com", POOLED_DB_URL, ALLOWED)).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/
    );
    expect(() => assertAllowedProject(API_URL, "postgresql://postgres:pw@localhost/db", ALLOWED)).toThrow(
      /DATABASE_URL/
    );
  });
});
