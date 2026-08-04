"use client";

// The root error boundary (1F/D3, S63) — added following Sentry's own Next.js
// reference, which flagged it as missing here.
//
// ⚠️ WHAT IT CATCHES THAT NOTHING ELSE DOES: errors thrown in the ROOT LAYOUT
// and React render errors that escape every nested boundary. `instrumentation.ts`'s
// `onRequestError` covers server request errors and `instrumentation-client.ts`
// covers unhandled browser exceptions, but neither sees a render that blows up
// the whole tree — which is precisely the failure that shows the user a blank
// page and is therefore the one most worth having a report for.
//
// ⚠️ It renders Next's own minimal error page rather than the app's chrome, and
// that is deliberate: this boundary replaces the root layout, so any component
// of ours it tried to render could be the very thing that just threw.

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
