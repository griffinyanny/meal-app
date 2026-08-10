"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { uploadFeedbackImage, FeedbackUploadError } from "@/lib/feedback/upload";
import type { ClientPayload } from "@/lib/feedback/payload";

export interface FeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Snapshotted by the TRIGGER at open time, not read here at submit time. See
  // the note on `captureClientPayload` — by the time this sheet is submitted the
  // route may have changed, a query may have refetched, and the ring buffer will
  // hold calls the sheet itself caused.
  payload: ClientPayload | null;
}

/**
 * The capture sheet (1F/E).
 *
 * ONE TEXT FIELD, an optional image, and send. No claim type, no severity, no
 * feature area — E0 call 6+7 put classification in the sweep, because a
 * submission routinely holds both a defect and a product direction, and asking
 * the reporter to pick is work done by the wrong person at the worst moment on
 * a feature whose whole thesis is friction-free volume. The route is in the
 * payload, so a feature-area select would be asking for something we already
 * have.
 *
 * ⚠️ NOT the §09 `FreeformField`, deliberately. That control is "the one way to
 * talk to the chef" in the spec's own words: it says *Send to chef*, its mic
 * says *voice is coming soon*, and it caps at three lines. None of that is true
 * here — this is dev chrome, dictation genuinely works through iOS's own
 * keyboard mic (zero code, E0 call 2), and a bug report wants room. What IS
 * reused is the rung: `.spec-input` is the named 16px floor from BUG-049, and
 * anything under 16px zooms the iOS viewport on focus and never zooms back.
 */
export function FeedbackSheet({
  open,
  onOpenChange,
  payload,
}: FeedbackSheetProps) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = trpc.feedback.submit.useMutation();

  function close() {
    onOpenChange(false);
  }

  // ⚠️ THE TEXT SURVIVES EVERY FAILURE. BUG-014 was "typed text lost on error",
  // and losing a bug report to a bug is the worst possible instance of it — the
  // one moment the reporter is already annoyed and least likely to retype. So
  // nothing here clears `body` except a confirmed success, and the sheet stays
  // open on failure with the draft intact and a retry in place.
  async function send() {
    if (!payload || !body.trim() || busy) return;
    setBusy(true);
    setError(null);

    try {
      let imagePath: string | null = null;
      if (file) {
        imagePath = await uploadFeedbackImage(file);
      }
      await submit.mutateAsync({ body: body.trim(), imagePath, payload });

      setSent(true);
      setBody("");
      setFile(null);
      // Long enough to read the confirmation, short enough not to trap him in a
      // sheet. The report is already written; this is only an acknowledgement.
      setTimeout(() => {
        setSent(false);
        close();
      }, 1200);
    } catch (err) {
      setError(
        err instanceof FeedbackUploadError
          ? err.message
          : err instanceof Error && err.message
            ? err.message
            : "Couldn't send that. Your report is still here — try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal={false} noBodyStyles>
      <DrawerContent className="glass-sheet" data-testid="feedback-sheet">
        <DrawerHeader className="pr-12 text-left">
          <DrawerTitle className="spec-feature-line">
            What happened?
          </DrawerTitle>
          <DrawerDescription className="spec-meta text-[var(--spec-text-caption)]">
            Describe the problem, not the state — the screen, the build and the
            last few requests are attached automatically.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-3 px-4 pb-8">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Ticking an item bounced it back after a second…"
            aria-label="What happened"
            data-testid="feedback-body"
            disabled={busy}
            className="spec-control w-full resize-none rounded-[16px] p-3 spec-input leading-[1.45] text-[var(--spec-text-primary)] caret-[var(--spec-action)] placeholder:text-[var(--spec-text-muted)] focus:outline-none disabled:opacity-60"
          />

          {/* iOS's own screenshot, then a plain file input. No capture code:
              getDisplayMedia does not exist in mobile Safari, and a
              DOM-to-canvas reconstruction disagrees with the bug on exactly the
              rendering bugs it is meant to show. */}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="feedback-image-input"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />

          {file ? (
            <div className="flex items-center justify-between rounded-[14px] border border-[rgba(240,222,190,0.1)] bg-[rgba(240,222,190,0.04)] px-3 py-2">
              <span className="min-w-0 flex-1 truncate spec-meta text-[var(--spec-text-muted)]">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                data-testid="feedback-image-remove"
                className="-m-1 flex size-11 flex-none items-center justify-center p-1 text-[var(--spec-text-muted)]"
              >
                {/* Icon-only, so the verb lives in a text node rather than an
                    interpolated aria-label (BUG-060). */}
                <X className="size-4" />
                <span className="sr-only">Remove attached image</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              data-testid="feedback-image-attach"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-[rgba(240,222,190,0.14)] spec-meta text-[var(--spec-text-muted)] transition-colors hover:bg-[rgba(240,222,190,0.04)]"
            >
              <ImagePlus className="size-4" strokeWidth={2} />
              Attach a screenshot
            </button>
          )}

          {error && (
            <p
              role="alert"
              data-testid="feedback-error"
              className="spec-meta text-destructive"
            >
              {error}
            </p>
          )}

          <Button
            className="w-full"
            onClick={send}
            disabled={!body.trim() || busy || !payload}
            data-testid="feedback-send"
          >
            {sent ? "Sent ✓" : busy ? "Sending…" : "Send report"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
