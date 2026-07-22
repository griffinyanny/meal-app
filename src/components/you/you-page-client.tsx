"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { createClient } from "@/lib/supabase/client";
import { TalkToChefSheet } from "@/components/shared/talk-to-chef-sheet";
import { ChefNarrativeCard } from "./chef-narrative-card";
import { SafetyConstraintsCard } from "./safety-constraints-card";
import { SoftConstraintsCard, type EditableField } from "./soft-constraints-card";
import { MemoryLedger } from "./memory-ledger";
import { AccountFooter } from "./account-footer";
import { FieldEditSheet } from "./field-edit-sheet";
import { YouToast, type YouToastState } from "./you-toast";
import {
  useYouMutations,
  MEMORIES_QUERY_INPUT,
  type Memory,
  type PreferencesPatch,
} from "./use-you-mutations";
import { buildNarrative, resolvePreferences } from "./build-narrative";
import { restrictionLabel, makeRestriction } from "./constraint-utils";

const CHEF_SUGGESTIONS = [
  "I'm not pescatarian anymore",
  "I'm allergic to gluten",
  "Actually I do like cream",
  "Add Japanese and Korean",
];

const TOAST_MS = 6000;

export function YouPageClient() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { setPreferences, deactivateMemory, reactivateMemory, reAddMemory } =
    useYouMutations();

  const preferencesQuery = trpc.user.preferences.useQuery();
  const memoriesQuery = trpc.user.memories.useQuery(MEMORIES_QUERY_INPUT);
  const accountQuery = trpc.user.account.useQuery();

  const [chefOpen, setChefOpen] = useState(false);
  const [field, setField] = useState<EditableField | null>(null);
  const [toast, setToast] = useState<YouToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  function showToast(message: string, onUndo?: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, onUndo });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  function handleUndo() {
    toast?.onUndo?.();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }

  const prefsData = preferencesQuery.data ?? null;
  const prefs = resolvePreferences(prefsData);
  const memories: Memory[] = memoriesQuery.data ?? [];
  // Truly new = no saved preferences AND nothing remembered. (A returning user who
  // dismissed every memory still has prefs, so they shouldn't see "We've just met.")
  const isNew = !prefsData && memories.length === 0;

  // ── Direct constraint edits (feature #2) — each with an undoable confirmation. ──
  function editArray(
    key: "restrictions" | "dislikes" | "cuisinePreferences",
    next: string[],
    message: string
  ) {
    const before = prefs[key];
    setPreferences({ [key]: next } as PreferencesPatch);
    showToast(message, () => setPreferences({ [key]: before } as PreferencesPatch));
  }

  const removeRestriction = (r: string) =>
    editArray(
      "restrictions",
      prefs.restrictions.filter((x) => x !== r),
      `Removed ${restrictionLabel(r)}.`
    );
  const addRestriction = (name: string) =>
    editArray("restrictions", [...prefs.restrictions, makeRestriction(name, false)], `Added ${name}.`);

  const removeDislike = (d: string) =>
    editArray("dislikes", prefs.dislikes.filter((x) => x !== d), `Removed ${d}.`);
  const addDislike = (name: string) =>
    editArray("dislikes", [...prefs.dislikes, name], `Added ${name}.`);

  const removeCuisine = (c: string) =>
    editArray(
      "cuisinePreferences",
      prefs.cuisinePreferences.filter((x) => x !== c),
      `Removed ${c}.`
    );
  const addCuisine = (name: string) =>
    editArray("cuisinePreferences", [...prefs.cuisinePreferences, name], `Added ${name}.`);

  function saveField(patch: PreferencesPatch) {
    // Capture the before-values of exactly the scalar fields the editors touch,
    // typed field-by-field (no type-checker-defeating cast).
    const before: PreferencesPatch = {};
    if (patch.dietaryFramework !== undefined)
      before.dietaryFramework = prefs.dietaryFramework as PreferencesPatch["dietaryFramework"];
    if (patch.householdSize !== undefined) before.householdSize = prefs.householdSize;
    if (patch.maxCookTimeWeeknight !== undefined)
      before.maxCookTimeWeeknight = prefs.maxCookTimeWeeknight;
    if (patch.maxCookTimeWeekend !== undefined)
      before.maxCookTimeWeekend = prefs.maxCookTimeWeekend;
    setPreferences(patch);
    showToast("Updated.", () => setPreferences(before));
  }

  // ── Memory ledger (features #3 + #6). ──
  function removeMemory(memory: Memory) {
    deactivateMemory(memory.id);
    showToast(
      memory.sourceType === "implicit"
        ? "Dismissed. I'll stop letting that shape your meals."
        : "Removed. Your chef will stop cooking around this.",
      () => reAddMemory(memory)
    );
  }

  // ── AI capture (feature #5, the hero) — free text → ops, with a full undo. ──
  const talkMutation = trpc.user.talk.useMutation({
    onSuccess: (data) => {
      utils.user.preferences.invalidate();
      utils.user.memories.invalidate(MEMORIES_QUERY_INPUT);
      setChefOpen(false);
      showToast(data.reply, () => {
        // The undo payload is the server's own stored before-values round-tripping
        // back through updatePreferences (which re-validates); dietaryFramework is
        // typed as a bare string in the apply-state, hence the boundary cast.
        if (Object.keys(data.undo.preferences).length > 0)
          setPreferences(data.undo.preferences as PreferencesPatch);
        data.undo.wroteMemoryIds.forEach((id) => deactivateMemory(id));
        data.undo.deactivatedMemoryIds.forEach((id) => reactivateMemory(id));
      });
    },
  });

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  // A failed fetch of the trust surface must NOT look like "you have no data yet"
  // (empty state) — show an honest error + retry (react-components.md rule).
  if (preferencesQuery.isError || memoriesQuery.isError || accountQuery.isError) {
    return (
      <div className="px-[22px] pt-16 text-center">
        <p className="text-[0.95rem] text-foreground">The chef couldn&apos;t load your profile.</p>
        <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => {
            preferencesQuery.refetch();
            memoriesQuery.refetch();
            accountQuery.refetch();
          }}
          className="mt-4 rounded-[14px] bg-primary px-5 py-2.5 text-[0.9rem] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    );
  }

  if (preferencesQuery.isLoading || memoriesQuery.isLoading || accountQuery.isLoading) {
    return (
      <div className="px-[22px] pt-14">
        <div className="h-64 animate-pulse rounded-[21px] bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <>
      <div
        className="space-y-6 px-[22px] pb-4"
        style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
      >
        <ChefNarrativeCard
          narrative={buildNarrative(prefsData, isNew)}
          isNew={isNew}
          onOpenChef={() => setChefOpen(true)}
        />

        <section className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            What I cook around
          </p>
          <SafetyConstraintsCard
            restrictions={prefs.restrictions}
            onRemove={removeRestriction}
            onAdd={addRestriction}
          />
          <SoftConstraintsCard
            prefs={prefs}
            onAddDislike={addDislike}
            onRemoveDislike={removeDislike}
            onAddCuisine={addCuisine}
            onRemoveCuisine={removeCuisine}
            onEditField={setField}
          />
        </section>

        <MemoryLedger
          memories={memories}
          onRemove={removeMemory}
          onEdit={() => setChefOpen(true)}
        />

        <AccountFooter account={accountQuery.data} onSignOut={signOut} />
      </div>

      <FieldEditSheet
        field={field}
        prefs={prefs}
        onClose={() => setField(null)}
        onSave={saveField}
      />

      <TalkToChefSheet
        open={chefOpen}
        onOpenChange={setChefOpen}
        onSubmit={(text) => talkMutation.mutate({ request: text })}
        isSubmitting={talkMutation.isPending}
        suggestions={CHEF_SUGGESTIONS}
        headline="Tell me what's changed."
        placeholder="Tell me anything…"
        workingLabel="Updating what I know…"
        modifyError={
          talkMutation.isError ? "The chef didn't catch that — give it another try." : null
        }
      />

      <YouToast toast={toast} onUndo={handleUndo} />
    </>
  );
}
