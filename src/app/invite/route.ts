// The only door through Gate 1. Visiting /invite?code=<code> once per browser
// sets the cookie that makes the rest of the app visible; the share link Griffin
// hands a beta tester is this URL, not the bare domain.
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, codesMatch, siteAccessCode } from "@/lib/access";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = siteAccessCode();

  // Gate off (public launch, local dev, E2E): /invite is just a link to login.
  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Wrong or missing code gets the SAME flat 404 as every other path, so probing
  // /invite can't be used to confirm that a gate exists or that a code was close.
  if (!codesMatch(searchParams.get("code"), code)) {
    return new NextResponse(
      "<!doctype html><title>404</title><h1>404</h1><p>This page could not be found.</p>",
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const response = NextResponse.redirect(`${origin}/login`);
  response.cookies.set(ACCESS_COOKIE, code, {
    httpOnly: true, // the gate is server-side only; JS never needs to read this
    secure: process.env.NODE_ENV === "production",
    // `lax` (not `strict`) is required: the Google OAuth redirect back to
    // /auth/callback is a top-level navigation from another origin, and `strict`
    // would withhold the cookie there and 404 the user mid-sign-in.
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return response;
}
