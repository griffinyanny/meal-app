// The service worker (1F/C).
//
// ⚠️ THE SCOPE OF THIS FILE IS NOT "OFFLINE". A service worker intercepts every
// request the app makes, permanently, on a device we cannot reach. It outlives
// a deploy, it outlives a hard refresh, and when it is wrong the failure lands
// on Griffin's phone with no address bar to escape it. Everything below is
// written against that, not against the happy path.
//
// It caches the SHELL only. It structurally cannot cache the data layer: the
// list arrives over `httpBatchLink`, which is a POST, and the Cache API rejects
// `Cache.put` on any non-GET request. Ship the obvious version and you get an
// app that opens instantly and shows an EMPTY list — failing in exactly the
// moment the feature exists for. The data half is React Query persistence to
// IndexedDB; see `src/lib/offline/`. Two mechanisms, no overlap.

// Bump when the CACHING LOGIC changes. It does NOT need bumping per deploy:
// nothing here is a precached asset list, so there is no list to go stale.
// `/_next/static/*` URLs are content-hashed, so a new build simply asks for
// URLs this cache has never seen. That is the whole reason to prefer runtime
// caching over a precache manifest for an app whose offline scope is one screen.
const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const CURRENT = [SHELL_CACHE, STATIC_CACHE];

// ⚠️ NEVER cached, and this list is the reason the PWA is not a brick.
//
// S59 shipped two bugs whose shape was "a request that looks signed-out gets
// redirected, and the redirect is indistinguishable from the real thing." A
// service worker turns that from a bad response into a PERSISTED bad response:
// cache a 307-to-/login under the /plan key and the installed app is pinned to
// the login screen forever, and a deploy does not clear it. `isCacheable()`
// below refuses redirects outright; this list is the second, independent guard,
// because auth pages should never be served from a cache under any condition.
const NEVER_CACHE = [
  /^\/api\//, // tRPC + route handlers. POST anyway, but say it out loud.
  /^\/auth\//, // the OAuth callback — where exchangeCodeForSession sets the cookie
  /^\/login/,
  /^\/invite/,
  /^\/no-access/,
];

function isNeverCached(pathname) {
  return NEVER_CACHE.some((re) => re.test(pathname));
}

// ⚠️ The single most important function in this file.
//
// `res.redirected` is true whenever fetch followed a redirect to produce this
// response — which is exactly what a signed-out (or apparently signed-out)
// navigation does on its way to /login. Without this check the cache key stays
// /plan while the BODY is the login page, and every later offline open serves
// a login screen from a URL that is not the login screen.
//
// `res.ok` bounds it to 200-299: never cache a 404, never cache a 5xx.
// `res.type === "basic"` bounds it to same-origin, non-opaque responses.
function isCacheable(res) {
  return Boolean(res) && res.ok && !res.redirected && res.type === "basic";
}

// ⚠️ WARMING IS NOT AN OPTIMISATION — WITHOUT IT THE FIRST LAUNCH IS THE ONE
// THAT FAILS, AND IT IS THE LAUNCH THAT MATTERS MOST.
//
// A service worker does not control the page that registers it. The navigation
// is already in flight when `register()` runs, so the very first visit to a
// route never passes through `fetch` and never lands in the cache. The worker
// then activates, reports itself healthy, and holds NOTHING.
//
// For a browser tab that is invisible: you come back tomorrow and the second
// visit caches it. For an installed PWA it is the whole feature failing at the
// exact moment it is needed — install the app, open it once, walk to the shop,
// and the icon opens a dead page. Caught by OF1/OF2 going ERR_FAILED, not by
// reasoning about it.
//
// Guarded by the same `isCacheable`, so a worker that activates while signed out
// fetches four redirects to /login and stores NONE of them.
const SHELL_ROUTES = ["/plan", "/groceries", "/recipes", "/you"];

async function warmShell() {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.all(
    SHELL_ROUTES.map(async (route) => {
      try {
        const res = await fetch(route, { credentials: "same-origin" });
        if (isCacheable(res)) await cache.put(route, res.clone());
      } catch {
        // Activating while already offline. Nothing to warm; not an error.
      }
    })
  );
}

// Immutable, content-hashed build output. Safe to serve from cache without
// revalidating, because the URL changes when the bytes change.
async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;

  const res = await fetch(request);
  if (isCacheable(res)) {
    const cache = await caches.open(STATIC_CACHE);
    // Clone BEFORE returning: a Response body can only be read once.
    cache.put(request, res.clone());
  }
  return res;
}

// Navigations. Network first so an online user is never served yesterday's
// shell, cache second so an offline cold launch still paints the app.
async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (isCacheable(res)) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    // ⚠️ `ignoreVary` matters here. Next sets `Vary` on its route responses, and
    // a warmed entry was fetched as a plain GET while this is a NAVIGATION —
    // different headers, so a Vary-respecting match misses an entry that is
    // sitting right there. The miss is indistinguishable from having cached
    // nothing at all, which is the most expensive kind of silence.
    const hit = await caches.match(request, { ignoreVary: true });
    if (hit) return hit;
    // Deliberately NOT falling back to the cached start_url: serving /plan's
    // shell under /groceries would show the wrong screen and claim it was the
    // right one. A designed offline page is one of Workstream C's four design
    // artifacts; until it exists, an honest failure beats a confident lie.
    throw err;
  }
}

self.addEventListener("install", () => {
  // Nothing to precache — see the VERSION note. Take over as soon as possible
  // rather than waiting for every tab to close; with runtime caching there is
  // no precache manifest for an old and new worker to disagree about.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !CURRENT.includes(n)).map((n) => caches.delete(n))
      );
      await self.clients.claim();
      // After claiming, so the worker is genuinely in charge before it caches
      // anything. See the note above `SHELL_ROUTES`.
      await warmShell();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Not a GET: hand it straight to the network. This is the tRPC path — every
  // mutation and every batched query is a POST. Offline behaviour for those is
  // React Query's paused-mutation queue, not this file.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Cross-origin (fonts, Supabase, OpenAI): never our business.
  if (url.origin !== self.location.origin) return;

  if (isNeverCached(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else (RSC payloads, images, the manifest) falls through to the
  // network untouched. Bounded on purpose: each one we add is another thing
  // that can be wrong on a phone.
});

// Lets the app drop everything on sign-out. The shell HTML is server-rendered
// with the household's real content in it, so leaving it cached after sign-out
// leaves one account's plan readable to the next.
self.addEventListener("message", (event) => {
  if (event.data === "clear-caches") {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
    );
  }
});
