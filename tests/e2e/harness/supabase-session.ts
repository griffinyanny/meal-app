// GENERIC harness utility — copyable to any @supabase/ssr app.
// Mints a REAL Supabase session for a dedicated test user (no OAuth dance) and
// converts it into Playwright storageState cookies. The session is a genuine
// signed JWT, so it passes the app's real server-side verification
// (getClaims/getUser) — this is an auth *bypass of the UI*, not of security.
import { createClient, type Session } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import postgres from "postgres";

export interface SupabaseAuthConfig {
  supabaseUrl: string;
  /**
   * The publishable/anon key. This is the ONLY Supabase key the harness needs —
   * see the note on `ensureTestAuthUser` for why the service-role key is gone.
   */
  anonKey: string;
  /** Direct Postgres connection (the same DATABASE_URL the seeder uses). */
  databaseUrl: string;
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

function anonClient(cfg: SupabaseAuthConfig) {
  return createClient(cfg.supabaseUrl, cfg.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Cold-start bootstrap: guarantees the dedicated test user exists, is email-
 * confirmed, and has exactly `cfg.password`. Runs entirely over the direct
 * Postgres connection — no GoTrue endpoint is involved.
 *
 * Why not the admin API (`/auth/v1/admin/*`): on a project using the new
 * `sb_publishable_` / `sb_secret_` keys with asymmetric (ES256) JWTs, every
 * admin endpoint rejects the secret key outright (`403 bad_jwt: unrecognized
 * JWT kid <nil>`) because the key isn't a JWT. An admin bootstrap therefore
 * cannot work at all on such a project, and would be a second, rarely-exercised
 * path on the ones where it does.
 *
 * Why not public `signUp` either: GoTrue's signup-time email validation rejects
 * reserved domains, so the deliberately-unroutable `@example.com` sentinel
 * address fails with `email_address_invalid` (the admin API skipped that check,
 * which is why the old harness worked). Signup would also send a real
 * confirmation email. Writing the rows directly keeps the test identity on an
 * address that can never receive mail — including a password-reset link.
 *
 * Only three columns of `auth.users` are NOT NULL without a default, but GoTrue
 * expects the standard `instance_id`/`aud`/`role` values, and password sign-in
 * requires the matching `auth.identities` row. `crypt(pw, gen_salt('bf'))`
 * produces the same bcrypt digest GoTrue writes itself.
 *
 * Idempotent, and self-healing if the password constant is ever rotated.
 */
async function ensureTestAuthUser(cfg: SupabaseAuthConfig): Promise<string> {
  const email = cfg.email.toLowerCase();
  const sql = postgres(cfg.databaseUrl, {
    prepare: false,
    ssl: "require",
    max: 1,
  });

  try {
    // Create-or-repair in one statement: a fresh row on cold start, and on every
    // later run a confirm + password reset so a half-created user or a rotated
    // password constant can't wedge the suite.
    const rows = await sql<{ id: string }[]>`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data
      ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        ${email},
        crypt(${cfg.password}, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb
      )
      ON CONFLICT (email) WHERE is_sso_user = false DO UPDATE
         SET encrypted_password = EXCLUDED.encrypted_password,
             email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
             updated_at = now()
      RETURNING id
    `;
    const userId = rows[0].id;

    // GoTrue scans these columns into non-nullable Go strings, so a NULL makes
    // every sign-in fail with an opaque "Database error querying schema". They
    // are nullable in Postgres and GoTrue's own inserts write "" — match that.
    // ("" is excluded from the partial unique indexes on the token columns,
    // which only cover values NOT matching '^[0-9 ]*$'.)
    await sql`
      UPDATE auth.users
         SET confirmation_token = COALESCE(confirmation_token, ''),
             recovery_token = COALESCE(recovery_token, ''),
             email_change = COALESCE(email_change, ''),
             email_change_token_new = COALESCE(email_change_token_new, ''),
             email_change_token_current = COALESCE(email_change_token_current, ''),
             phone_change = COALESCE(phone_change, ''),
             phone_change_token = COALESCE(phone_change_token, ''),
             reauthentication_token = COALESCE(reauthentication_token, '')
       WHERE id = ${userId}
    `;

    // Password sign-in resolves the account through this row, so a user without
    // it authenticates as nobody.
    await sql`
      INSERT INTO auth.identities (
        user_id, provider_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        ${userId}, ${userId}, 'email',
        jsonb_build_object(
          'sub', ${userId}::text, 'email', ${email}::text,
          'email_verified', true, 'phone_verified', false
        ),
        now(), now(), now()
      )
      ON CONFLICT DO NOTHING
    `;

    return userId;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function mintSupabaseSession(
  cfg: SupabaseAuthConfig
): Promise<MintedSession> {
  // Warm path: the test user already exists, so an ordinary password sign-in
  // with the publishable key is all we need — the session carries the uid.
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

  // Cold start (user absent / unconfirmed / password drifted): bootstrap, then
  // sign in for real. No fallback below this — if it fails, the message says why.
  const userId = await ensureTestAuthUser(cfg);
  const retry = await anonClient(cfg).auth.signInWithPassword({
    email: cfg.email,
    password: cfg.password,
  });
  if (!retry.data.session?.user) {
    throw new Error(
      `Bootstrapped the E2E test user ${cfg.email} (uid ${userId}) but sign-in ` +
        `still failed: ${retry.error?.message ?? "no session returned"}. ` +
        `Check that the Email provider is enabled in Supabase → Authentication → ` +
        `Providers, and that the account is not banned.`
    );
  }
  return {
    userId: retry.data.session.user.id,
    session: retry.data.session,
  };
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
