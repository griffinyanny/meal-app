import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/access";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/plan";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/plan";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Gate 2, at the earliest point a session exists. Rejecting HERE rather
      // than on the first page view means a non-invited Google account never
      // gets as far as having a usable session, so nothing downstream (a user
      // row, a household, an AI call) is ever created for it.
      if (!isEmailAllowed(data.user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/no-access`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
