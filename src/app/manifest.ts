import type { MetadataRoute } from "next";

// The web app manifest. Next builds this to /manifest.webmanifest.
//
// ⚠️ `scope` IS THE LOAD-BEARING FIELD, and getting it wrong breaks sign-in
// silently. On iOS a standalone PWA opens any out-of-scope URL in an in-app
// SafariViewController *inside* the PWA window, with storage isolated from the
// PWA's own. It returns to the PWA only when the external site redirects back
// INTO scope. Our Google OAuth round trip leaves for accounts.google.com and
// comes back to /auth/callback, where `exchangeCodeForSession` sets the session
// cookie server-side on the redirect response — so the cookie lands in whatever
// storage context made that request.
//
// Scope it to "/plan" (the plausible choice, since that is where the app lives)
// and /auth/callback falls outside: the exchange completes in the in-app
// browser's isolated storage, the PWA never sees the cookie, and the installed
// app bounces back to /login forever. No error, no log — it just cannot sign
// in. `manifest.test.ts` asserts every auth route stays inside scope.
//
// Second consequence, expected rather than broken: Safari's session does NOT
// carry into the installed app. The first launch always asks you to sign in
// again even though the same phone is signed in one tab over.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meal App",
    // iOS truncates the home-screen label at roughly 12 characters.
    short_name: "Meal App",
    description: "Your personal chef. AI-powered meal planning.",
    // The week is the front door; /plan is where the north-star flow starts.
    start_url: "/plan",
    // ⚠️ Everything, deliberately. See the note above — this is not boilerplate.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Matches --spec-floor. The splash and the launch chrome are drawn from
    // these two, so a mismatch here shows up as a flash of the wrong colour
    // between the splash and first paint.
    background_color: "#0F0B08",
    theme_color: "#0F0B08",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android masks icons to the device's shape; a maskable icon keeps 20%
      // padding so the crop never eats the mark. Both phones here are iPhones,
      // which ignore this entirely — it is correctness insurance, not live.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
