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
    actions.reorderItems(arrayMove(ids, from, to));
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

      <AddItemRow variant="top" onAdd={handleAdd} data-testid="grocery-add-top" />
      {dedupeNotice && (
        <p className="px-1 text-[12px] text-[#FF9F0A]" data-testid="grocery-dedupe">
          {dedupeNotice}
        </p>
      )}

      {empty ? (
        <p className="px-1 pt-2 text-sm text-muted-foreground">
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
    </div>
  );
}
