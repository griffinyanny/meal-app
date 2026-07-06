import { NextResponse, type NextRequest } from "next/server";

// Route-level guard only. We intentionally do NOT call supabase.auth.getUser()
// here: in the long-lived Node.js proxy runtime, createServerClient accumulates
// internal auth-lock state across requests and deadlocks after the first call.
// Real auth verification happens in tRPC's protectedProcedure (server-side
// getUser) and in the (app) layout. This proxy only does fast cookie-presence
// routing — no network calls, so it can never hang.
export async function updateSession(request: NextRequest) {
  const isAuthPage =
    request.nextUrl.pathname === "/login" ||
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
