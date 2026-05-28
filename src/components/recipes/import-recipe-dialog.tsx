"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Link2 } from "lucide-react";

export type ImportRecipeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (recipeId: string) => void;
};

export function ImportRecipeDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportRecipeDialogProps) {
  const [url, setUrl] = useState("");
  const utils = trpc.useUtils();

  const importRecipe = trpc.recipe.importUrl.useMutation({
    onSuccess: (recipe) => {
      utils.recipe.list.invalidate();
      setUrl("");
      onOpenChange(false);
      onSuccess(recipe.id);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-sheet rounded-t-3xl sm:rounded-2xl max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" />
            Import from URL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Input
            placeholder="Paste a recipe URL..."
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-white/5 border-white/8"
            disabled={importRecipe.isPending}
          />

          <p className="text-xs text-muted-foreground">
            Works with most recipe sites. Your chef will extract the recipe and
            save it to your library.
          </p>

          {importRecipe.error && (
            <p className="text-xs text-destructive">
              {importRecipe.error.message}
            </p>
          )}

          <Button
            className="w-full"
            disabled={!url.trim() || importRecipe.isPending}
            onClick={() => importRecipe.mutate({ url: url.trim() })}
          >
            {importRecipe.isPending ? "Reading recipe..." : "Import recipe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
