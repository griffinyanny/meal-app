"use client";

import { useEffect } from "react";

// Registers the app-shell service worker (1F/C). Renders nothing.
//
// ⚠️ PRODUCTION BUILDS ONLY, and that is not caution — a service worker in
// `next dev` caches the shell out from under hot reload, so you edit a file,
// see no change, and go looking for the bug in your own code. The E2E harness
// runs a real production build (`npm run build && npm run start`), so the
// worker is still exercised by the suite; only `next dev` opts out.
//
// Mounted in the ROOT layout rather than the (app) group. The worker is inert
// on every auth path by construction (`NEVER_CACHE` in `public/sw.js` returns
// before it touches /login, /auth, /invite, /no-access), so there is nothing to
// gain from registering it later and one more conditional to get wrong.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // Failure here is not worth surfacing: an unregistered worker means the app
    // behaves exactly as it did before this file existed. Offline stops working;
    // nothing else does.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}

// Clearing these caches on sign-out lives in `clearOfflineState()`
// (`src/lib/offline/persister.ts`) rather than here, because the shell cache and
// the persisted query cache have to be dropped together — the shell HTML is
// server-rendered with the household's real content baked in, so clearing one
// half still leaves someone's week readable on the device.
