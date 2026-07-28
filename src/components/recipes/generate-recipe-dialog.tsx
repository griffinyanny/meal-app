"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
          <Textarea
            placeholder="What are you in the mood for?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] bg-[rgba(240,222,190,0.05)] border-[rgba(240,222,190,0.08)] resize-none"
            disabled={generate.isPending}
          />

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

          {generate.error && (
            <p className="text-xs text-destructive">
              {generate.error.message}
            </p>
          )}

          <Button
            className="w-full"
            disabled={!prompt.trim() || generate.isPending}
            onClick={() => generate.mutate({ prompt: prompt.trim() })}
          >
            {generate.isPending ? "Brainstorming..." : "Generate recipe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
