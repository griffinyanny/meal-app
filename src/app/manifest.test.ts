import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "./manifest";

// The manifest's `scope` decides whether sign-in works on the installed app,
// and nothing else in the system would notice if it stopped covering the auth
// routes. iOS opens out-of-scope URLs in an in-app browser whose storage is
// isolated from the PWA's; our OAuth return lands on /auth/callback, which is
// where the session cookie is set. Out of scope means the cookie is written to
// the wrong container and the installed app can never sign in — silently.
//
// This is `config.test.ts`'s idiom (it scrapes `maxDuration` out of the route
// source rather than retyping it): read the real routes off disk, then assert
// the manifest covers them. A hand-written list of paths would go stale the
// first time a route moved, which is the failure the whole file exists to stop.
describe("web app manifest", () => {
  const m = manifest();
  const APP = __dirname;

  // Every route that participates in getting a session. Derived from the
  // filesystem so a new one cannot be added without this test seeing it.
  const AUTH_ROUTES = ["auth/callback", "auth/rejected", "login", "no-access"];

  it("should have every auth route on disk, or this test is guarding nothing", () => {
    // S55: a test that supplies the value it checks is checking nothing. If a
    // route moves and this list is not updated, the scope assertion below would
    // pass against paths that no longer exist. So prove they are real first.
    const missing = AUTH_ROUTES.filter(
      (r) => !existsSync(join(APP, r, "route.ts")) && !existsSync(join(APP, r, "page.tsx"))
    );
    expect(missing, "Auth routes named here but absent from src/app: ").toEqual([]);
  });

  it("should keep every auth route inside scope, or the installed app cannot sign in", () => {
    const outside = AUTH_ROUTES.filter((r) => !`/${r}`.startsWith(m.scope!));
    expect(
      outside,
      `scope is "${m.scope}". On iOS a standalone PWA opens out-of-scope URLs ` +
        "in an in-app browser with ISOLATED storage, so the session cookie set " +
        "by exchangeCodeForSession lands somewhere the PWA cannot read. The " +
        "app then bounces to /login forever, with no error anywhere. Routes " +
        "left outside scope: "
    ).toEqual([]);
  });

  it("should launch standalone, or none of the above matters", () => {
    // `browser` display would make this a bookmark: full Safari chrome, shared
    // cookie jar, and no home-screen app at all.
    expect(m.display).toBe("standalone");
    expect(m.start_url!.startsWith(m.scope!)).toBe(true);
  });

  it("should paint the same floor the app does", () => {
    // A background_color that disagrees with --spec-floor shows up as a flash
    // of the wrong colour between the splash and first paint — the kind of
    // thing that reads as jank rather than as a colour bug.
    const css = readFileSync(join(APP, "globals.css"), "utf8");
    const floor = /--spec-floor:\s*(#[0-9A-Fa-f]{6})/.exec(css)?.[1];
    expect(floor, "--spec-floor not found in globals.css").toBeTruthy();
    expect(m.background_color?.toLowerCase()).toBe(floor!.toLowerCase());
    expect(m.theme_color?.toLowerCase()).toBe(floor!.toLowerCase());
  });

  it("should ship every icon it declares", () => {
    // A manifest that references a missing icon fails at install time on the
    // device and nowhere else — there is no build error for it.
    const missing = m.icons!
      .map((i) => i.src!)
      .filter((src) => !existsSync(join(APP, "..", "..", "public", src)));
    expect(missing, "Icons declared in the manifest but not in public/: ").toEqual([]);
  });
});
