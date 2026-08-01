"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  GROCERY_CATEGORIES,
  guessCategory,
  type GroceryCategory,
} from "@/lib/grocery-categories";
import { useGroceryMutations, type GroceryData, type GroceryItem } from "./use-grocery-mutations";
import { capitalizeName } from "./grocery-format";
import { formatListForClipboard } from "./grocery-export";
import { GroceryListHeader } from "./grocery-list-header";
import { OrganizeToggle } from "./organize-toggle";
import { AddItemRow } from "./add-item-row";
import { StaplesRow } from "./staples-row";
import { GroceryChefSheet } from "./grocery-chef-sheet";
import { GrocerySection } from "./grocery-section";
import { SortableGroceryRow } from "./grocery-row";
import { GotItZone } from "./got-it-zone";

const KNOWN_CATEGORIES = new Set<string>(GROCERY_CATEGORIES);

// The shoppable list (the ready state). Builds the imported design: grouped ↔
// ungrouped with drag-reorder, inline merge-review, one-zone check-off, quick-add
// and export. Drag is touch-first (long-press to lift) so it matches the phone
// gesture the native app will use; the pointer sensor keeps it usable on desktop.
export function GroceryList({ list }: { list: GroceryData }) {
  const actions = useGroceryMutations(list.id);
  const [dedupeNotice, setDedupeNotice] = useState<string | null>(null);
  const [chefOpen, setChefOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const items = list.items;
  const total = items.length;
  const checkedItems = items.filter((i) => i.isChecked);
  const visibleItems = items.filter((i) => !i.isChecked);

  // Persisted aisle order, keeping only known categories and appending any that
  // aren't stored yet (e.g. a category introduced by a quick-add).
  const stored = (list.aisleOrder ?? []).filter((c) => KNOWN_CATEGORIES.has(c)) as GroceryCategory[];
  const aisleOrder: GroceryCategory[] = [
    ...stored,
    ...GROCERY_CATEGORIES.filter((c) => !stored.includes(c)),
  ];

  const byCategory = new Map<GroceryCategory, GroceryItem[]>();
  for (const item of visibleItems) {
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item);
    byCategory.set(item.category, bucket);
  }
  const sectionCats = aisleOrder.filter((c) => (byCategory.get(c)?.length ?? 0) > 0);
  const flat = [...visibleItems].sort((a, b) => a.position - b.position);

  // Lowercased names on the list, so the staples row can hide staples that are
  // already added (tapping a chip grows this via the optimistic add → chip goes).
  const onList = new Set(items.map((i) => i.name.trim().toLowerCase()));

  function handleAdd(name: string) {
    const norm = name.trim().toLowerCase();
    const dup = items.find((i) => i.name.trim().toLowerCase() === norm);
    if (dup) {
      setDedupeNotice(`${capitalizeName(dup.name)} is already on your list`);
      setTimeout(() => setDedupeNotice(null), 2600);
      return;
    }
    actions.addItem(name, guessCategory(name));
  }

  // A staple tap adds with the staple's curated category (no AI guess) and
  // "staple" provenance. The row already hides staples on the list, so no dedupe.
  function handleAddStaple(name: string, category: GroceryCategory) {
    actions.addItem(name, category, "staple");
  }

  function handleCopy() {
    void navigator.clipboard?.writeText(formatListForClipboard(items));
  }

  function onSectionDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = aisleOrder.indexOf(active.id as GroceryCategory);
    const to = aisleOrder.indexOf(over.id as GroceryCategory);
    if (from < 0 || to < 0) return;
    actions.reorderSections(arrayMove(aisleOrder, from, to));
  }

  function onItemDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = flat.map((i) => i.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from < 0 || to < 0) return;
    // Renumber the WHOLE list (reordered visible items, then checked items in
    // their existing order) so positions stay a contiguous 0..N-1 — otherwise
    // checked items keep stale positions and reappear out of order once unchecked.
    const checkedIds = [...checkedItems]
      .sort((a, b) => a.position - b.position)
      .map((i) => i.id);
    actions.reorderItems([...arrayMove(ids, from, to), ...checkedIds]);
  }

  const empty = total === 0;

  return (
    <div className="space-y-4" data-testid="grocery-list">
      <GroceryListHeader
        total={total}
        checkedCount={checkedItems.length}
        onCopy={handleCopy}
      />

      <OrganizeToggle mode={list.organizeMode} onChange={actions.setOrganizeMode} />

      <AddItemRow
        variant="top"
        onAdd={handleAdd}
        onOpenChef={() => setChefOpen(true)}
        data-testid="grocery-add-top"
      />
      {/* BUG-045. Amber is the chef (§01 has no caution hue precisely because of
          that), and "milk is already on your list" is a mechanical fact about
          the list, not the chef speaking — the same miscast B5 removed from the
          merge marker one affordance over. Law 03 also forbids colouring
          anything you simply read. Flat meta type, which is what it is: a fact
          about the row above. 12 → 12.5 is the meta rung. */}
      {dedupeNotice && (
        <p
          className="px-1 spec-meta text-[var(--spec-text-muted)]"
          data-testid="grocery-dedupe"
        >
          {dedupeNotice}
        </p>
      )}

      <StaplesRow onList={onList} onAdd={handleAddStaple} />

      {empty ? (
        <p className="px-1 pt-2 spec-body text-muted-foreground">
          Your list is empty. Add an item above, or confirm a plan to fill it.
        </p>
      ) : list.organizeMode === "grouped" ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
          <SortableContext items={sectionCats} strategy={verticalListSortingStrategy}>
            {sectionCats.map((cat) => (
              <GrocerySection
                key={cat}
                category={cat}
                items={byCategory.get(cat)!}
                onToggleCheck={actions.toggleCheck}
                onEdit={actions.editItem}
                onSplit={actions.splitItem}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemDragEnd}>
          <SortableContext items={flat.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="glass-card mt-2 overflow-hidden">
              {flat.map((item, i) => (
                <SortableGroceryRow
                  key={item.id}
                  item={item}
                  isFirst={i === 0}
                  onToggleCheck={actions.toggleCheck}
                  onEdit={actions.editItem}
                  onSplit={actions.splitItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!empty && (
        <AddItemRow variant="bottom" onAdd={handleAdd} data-testid="grocery-add-bottom" />
      )}

      <GotItZone
        items={checkedItems}
        onUncheck={(id) => actions.toggleCheck(id, false)}
        onClear={actions.clearChecked}
      />

      <GroceryChefSheet
        open={chefOpen}
        onOpenChange={setChefOpen}
        listId={list.id}
      />
    </div>
  );
}
