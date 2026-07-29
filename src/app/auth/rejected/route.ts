// Exists only so the (app) layout has somewhere to send a session that is no
// longer on the allowlist. A Server Component can't clear the auth cookie; a
// route handler can. Sign out first, THEN redirect — bouncing to /login while
// the session cookie is still set would ping-pong off the proxy's
// "signed in on /login -> go to /plan" rule.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/no-access`);
}
