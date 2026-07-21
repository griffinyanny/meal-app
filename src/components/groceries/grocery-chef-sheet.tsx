"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TalkToChefSheet } from "@/components/shared/talk-to-chef-sheet";

const SUGGESTIONS = [
  "Add stuff for taco night",
  "What am I out of?",
  "Add snacks for the week",
];

interface GroceryChefSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
}

// The Groceries "Talk to the Chef" sheet: a free-text add/query path (secondary
// to the text quick-add). Owns the `grocery.talk` mutation and reuses the shared
// sheet. On success it refetches the list (adds/removes land behind the sheet)
// and shows the chef's one-line reply — so a query-only ask ("what am I out of")
// still surfaces an answer.
export function GroceryChefSheet({ open, onOpenChange, listId }: GroceryChefSheetProps) {
  const utils = trpc.useUtils();
  const [reply, setReply] = useState<string | null>(null);

  const talk = trpc.grocery.talk.useMutation({
    onSuccess: (res) => {
      setReply(res.reply);
      if (res.added > 0 || res.removed > 0) utils.grocery.current.invalidate();
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReply(null);
      talk.reset();
    }
    onOpenChange(next);
  }

  return (
    <TalkToChefSheet
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={(text) => {
        setReply(null);
        talk.mutate({ listId, request: text });
      }}
      isSubmitting={talk.isPending}
      suggestions={SUGGESTIONS}
      headline="What else do you need?"
      placeholder="Tell me what you're out of, or a meal to shop for…"
      workingLabel="Reading your list and combining…"
      modifyError={talk.isError ? "The chef couldn't do that — try again." : null}
      resultMessage={reply}
    />
  );
}
