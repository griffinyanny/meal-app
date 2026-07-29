import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, shouldBlockRequest, siteAccessCode } from "@/lib/access";

// A flat 404 rather than a branded "you need an invite" page: a gate page tells
// a crawler there is something here worth coming back for, a 404 tells it there
// is nothing. Body kept minimal for the same reason.
function notFound(): NextResponse {
  return new NextResponse(
    "<!doctype html><title>404</title><h1>404</h1><p>This page could not be found.</p>",
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

// Route-level guard only. We intentionally do NOT call supabase.auth.getUser()
// here: in the long-lived Node.js proxy runtime, createServerClient accumulates
// internal auth-lock state across requests and deadlocks after the first call.
// Real auth verification happens in tRPC's protectedProcedure (server-side
// getUser) and in the (app) layout. This proxy only does fast cookie-presence
// routing — no network calls, so it can never hang.
export async function updateSession(request: NextRequest) {
  // Gate 1 runs FIRST and independently of auth: a visitor without the invite
  // cookie must not learn that a login screen exists here. Off entirely when
  // SITE_ACCESS_CODE is unset. See src/lib/access.ts.
  if (
    shouldBlockRequest(
      request.nextUrl.pathname,
      request.cookies.get(ACCESS_COOKIE)?.value,
      siteAccessCode()
    )
  ) {
    return notFound();
  }

  // Signed-out-reachable paths. /invite and /no-access join /login and /auth
  // here because both are reached WITHOUT a session by design — /invite is the
  // step before signing in, and /no-access is shown immediately after being
  // signed out. Omitting them would bounce both to /login and strand the user.
  //
  // /robots.txt is here for the same reason and was caught in live verification:
  // the proxy matcher excludes _next/* and image extensions but NOT .txt, so a
  // crawler asking for robots.txt was being 307'd to /login and never read the
  // Disallow. Kept INSIDE the matcher rather than excluded from it, so that
  // Gate 1 still 404s it when the gate is on — when nothing is visible, robots
  // .txt should not be either.
  const isAuthPage =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/invite" ||
    request.nextUrl.pathname === "/no-access" ||
    request.nextUrl.pathname === "/robots.txt" ||
    request.nextUrl.pathname.startsWith("/auth");

  // Large sessions (e.g. Google OAuth) get chunked by @supabase/ssr into
  // sb-<ref>-auth-token.0 / .1 — match those too. Deliberately NOT matching
  // sb-<ref>-auth-token-code-verifier, which exists mid-OAuth before auth.
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));

  if (!hasSessionCookie && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSessionCookie && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/plan";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
