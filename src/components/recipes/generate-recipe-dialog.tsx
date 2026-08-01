"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FreeformField } from "@/components/shared/freeform-field";
import { trpc } from "@/lib/trpc";
import { Sparkles } from "lucide-react";

export type GenerateRecipeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (recipeId: string) => void;
};

const SUGGESTION_CHIPS = [
  "Quick weeknight chicken dinner",
  "Healthy lunch under 30 minutes",
  "Something with salmon and vegetables",
  "Comfort food for a rainy evening",
];

export function GenerateRecipeDialog({
  open,
  onOpenChange,
  onSuccess,
}: GenerateRecipeDialogProps) {
  const [prompt, setPrompt] = useState("");
  const utils = trpc.useUtils();

  const generate = trpc.recipe.generate.useMutation({
    onSuccess: (recipe) => {
      utils.recipe.list.invalidate();
      setPrompt("");
      onOpenChange(false);
      onSuccess(recipe.id);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-sheet rounded-t-[22px] sm:rounded-[22px] max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Ask your chef
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Chips ABOVE the field, which is where §09 puts them: they are
              shortcuts into it, not a second input. */}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                className="text-xs px-2.5 py-1 rounded-full bg-[rgba(240,222,190,0.05)] text-muted-foreground hover:bg-[rgba(240,222,190,0.1)] transition-colors"
                onClick={() => setPrompt(chip)}
                disabled={generate.isPending}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* The §09 control's send IS the commit. The full-width
              `Generate recipe` button underneath is deleted rather than kept
              beside it: it was a second filled cream button in the same
              viewport (§08 law 06 — "if two actions both feel primary, one of
              them is not"), and every other freeform field in the app already
              commits from inside the control. */}
          <FreeformField
            value={prompt}
            onChange={setPrompt}
            onSubmit={() => {
              if (prompt.trim() && !generate.isPending) {
                generate.mutate({ prompt: prompt.trim() });
              }
            }}
            placeholder="What are you in the mood for?"
            inputAriaLabel="Ask your chef for a recipe"
            isSubmitting={generate.isPending}
            submittingLabel="BRAINSTORMING…"
            inputTestId="generate-recipe-input"
            sendTestId="generate-recipe-send"
          />

          {generate.error && (
            <p className="spec-meta text-destructive">
              {generate.error.message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
