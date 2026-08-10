// Screenshot upload for feedback reports (1F/E, E0 call 2).
//
// ⚠️ NO CAPTURE CODE, AND THAT IS THE WHOLE DESIGN. `getDisplayMedia` does not
// exist in mobile Safari, so the S39 vision's screen-recording half is not
// buildable on the only platform R1 runs on. A DOM-to-canvas screenshot would
// produce a *reconstruction* rather than what he saw, and it would disagree with
// the bug on exactly the rendering bugs it exists to capture. So: he takes an
// iOS screenshot the way he already does, and attaches it through a plain file
// input. Real pixels, zero capture code.
//
// ⚠️ THE BROWSER UPLOADS DIRECT TO SUPABASE, NEVER THROUGH OUR OWN SERVER.
// Fewer moving parts, and it sidesteps Vercel's 4.5MB request-body limit — which
// does not bite for a screenshot and would hard-block a screen recording, so the
// architecture keeps video reachable without R1 building for it.
//
// ⚠️ AND THIS IS THE ONE PATH IN THE APP WHERE RLS IS LOAD-BEARING. The request
// carries the anon key plus the user's JWT, which is **door 1** (see
// `.claude/rules/drizzle-schema.md` → "Two doors"), and door 1 is held by RLS
// alone. `feedback_insert_own_prefix` is what stops a caller writing outside
// their own folder; `scripts/setup-feedback-storage.mjs` provisions it.
import { createClient } from "@/lib/supabase/client";

export const FEEDBACK_BUCKET = "feedback";

// Mirrors the bucket's own `allowed_mime_types`. Duplicated deliberately and
// narrowly: this one produces a legible message before the upload, the bucket's
// is the enforcement. The bucket is authoritative — if these ever disagree, the
// upload fails server-side and the sheet keeps the text.
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/heic": "heic",
};

export class FeedbackUploadError extends Error {}

/**
 * Upload a screenshot and return its storage path.
 *
 * ⚠️ THE PATH IS MINTED HERE, BEFORE THE ROW EXISTS. The alternative — submit,
 * read back the id, upload, then patch the row — needs a second mutation and
 * leaves a window where the row claims no image. An orphaned object (upload
 * lands, submit then fails) is harmless: the sweep reads paths off rows, so
 * anything unreferenced is simply never looked at.
 *
 * ⚠️ THE USER ID IS READ FROM THE SUPABASE SESSION HERE, NOT PASSED IN. Three
 * separate things have to agree on it: the storage policy compares the first
 * path segment to `auth.uid()`, `feedback.submit` compares it to `ctx.user.id`,
 * and this builds it. Deriving it from the same session the policy resolves
 * makes that agreement structural rather than something a caller could get
 * wrong — and it removes a prop that had no other reason to exist.
 */
export async function uploadFeedbackImage(file: File): Promise<string> {
  const extension = EXTENSION_BY_TYPE[file.type];
  if (!extension) {
    throw new FeedbackUploadError(
      "That file type isn't supported — a screenshot (PNG or JPEG) works."
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new FeedbackUploadError(
      "Couldn't attach that image — you may need to sign in again."
    );
  }

  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(FEEDBACK_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    // Surfaced to the reporter rather than swallowed: a silently-dropped
    // screenshot means he believes the image is attached and it is not, which
    // is worse than being told to send the report without it.
    throw new FeedbackUploadError(
      "Couldn't attach that image. You can still send the report without it."
    );
  }

  return path;
}
