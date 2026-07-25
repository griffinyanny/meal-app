// GENERIC harness utility — copyable to any @supabase/ssr app.
// Mints a REAL Supabase session for a dedicated test user (no OAuth dance) and
// converts it into Playwright storageState cookies. The session is a genuine
// signed JWT, so it passes the app's real server-side verification
// (getClaims/getUser) — this is an auth *bypass of the UI*, not of security.
import { createClient, type Session } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export interface SupabaseAuthConfig {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  email: string;
  password: string;
  /** Cookie domain for storageState (default "localhost"). */
  cookieDomain?: string;
}

export interface MintedSession {
  userId: string;
  session: Session;
}

export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax" | "Strict" | "None";
  expires: number;
}

export interface StorageState {
  cookies: PlaywrightCookie[];
  origins: never[];
}

function adminClient(cfg: SupabaseAuthConfig) {
  return createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function anonClient(cfg: SupabaseAuthConfig) {
  return createClient(cfg.supabaseUrl, cfg.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findUserByEmail(
  admin: ReturnType<typeof adminClient>,
  email: string
): Promise<{ id: string } | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return { id: found.id };
    if (data.users.length < 200) return null;
  }
  return null;
}

// Idempotent: creates the test auth user (email pre-confirmed) or resets its
// password to the per-run value. Returns the auth uid.
export async function ensureAuthUser(cfg: SupabaseAuthConfig): Promise<string> {
  const admin = adminClient(cfg);
  const existing = await findUserByEmail(admin, cfg.email);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: cfg.password,
      email_confirm: true,
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: cfg.email,
    password: cfg.password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw error ?? new Error("createUser returned no user");
  }
  return data.user.id;
}

// Sign in without touching the UI. Tries password, then magic-link OTP. Both
// require the Supabase "Email" provider to be enabled (Auth → Providers →
// Email). Neither sends an actual email. A clear error names the fix.
async function obtainSession(cfg: SupabaseAuthConfig): Promise<Session> {
  const anon = anonClient(cfg);

  const pw = await anon.auth.signInWithPassword({
    email: cfg.email,
    password: cfg.password,
  });
  if (pw.data.session) return pw.data.session;

  // Fallback: server-generated magic link (no SMTP needed) → verify OTP.
  const admin = adminClient(cfg);
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: cfg.email,
  });
  const tokenHash = link.data.properties?.hashed_token;
  if (!link.error && tokenHash) {
    const otp = await anon.auth.verifyOtp({
      type: "email",
      token_hash: tokenHash,
    });
    if (otp.data.session) return otp.data.session;
  }

  throw new Error(
    `Could not mint a Supabase session for ${cfg.email}. ` +
      `Password sign-in failed (${pw.error?.message ?? "no session"}) and the ` +
      `magic-link fallback failed. Most likely the Email provider is disabled — ` +
      `enable it in Supabase → Authentication → Providers → Email (no SMTP required).`
  );
}

export async function mintSupabaseSession(
  cfg: SupabaseAuthConfig
): Promise<MintedSession> {
  // Happy path: sign in as the test user with the PUBLISHABLE/anon key alone.
  // No admin API, no service-role key, and no 50-page listUsers scan — the
  // session itself carries the uid we need.
  //
  // This isn't just an optimization. On a project using the new
  // sb_publishable_/sb_secret_ key format with asymmetric (ES256) JWTs, GoTrue's
  // /auth/v1/admin/* endpoints reject the secret key outright — it isn't a JWT,
  // so they fail with `bad_jwt: unrecognized JWT kid <nil>`. The privileged
  // bootstrap below is therefore unusable on such projects, while ordinary
  // sign-in works fine. Reaching for admin only when sign-in actually fails
  // keeps the harness working across both key regimes.
  const signedIn = await anonClient(cfg).auth.signInWithPassword({
    email: cfg.email,
    password: cfg.password,
  });
  if (signedIn.data.session?.user) {
    return {
      userId: signedIn.data.session.user.id,
      session: signedIn.data.session,
    };
  }

  // Cold start (the test user doesn't exist yet) or a changed password: fall
  // back to the privileged bootstrap. Requires a service-role key the admin API
  // accepts — i.e. a legacy JWT-format key.
  const userId = await ensureAuthUser(cfg);
  const session = await obtainSession(cfg);
  return { userId, session };
}

// Replays the session through @supabase/ssr's server client with a
// cookie-capturing adapter, so the emitted cookies (including chunking/base64)
// are byte-identical to what the app itself would write. Then shapes them as
// Playwright storageState cookies.
export async function sessionToStorageState(
  cfg: SupabaseAuthConfig,
  session: Session
): Promise<StorageState> {
  const captured: { name: string; value: string }[] = [];
  const client = createServerClient(cfg.supabaseUrl, cfg.anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (toSet) => {
        for (const { name, value } of toSet) captured.push({ name, value });
      },
    },
  });

  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const domain = cfg.cookieDomain ?? "localhost";
  const cookies: PlaywrightCookie[] = captured.map((c) => ({
    name: c.name,
    value: c.value,
    domain,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires,
  }));

  return { cookies, origins: [] };
}
