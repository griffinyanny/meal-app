import type { GroceryItem } from "./use-grocery-mutations";

// Render a stored (quantity, unit) as a display string. Empty when there's no
// amount — the row shows a faint "qty" affordance instead of a hard "as needed".
export function formatQty(quantity: number | null, unit: string | null): string {
  if (quantity == null) return "";
  const n = Number.isInteger(quantity)
    ? String(quantity)
    : String(Math.round(quantity * 100) / 100);
  return unit ? `${n} ${unit}` : n;
}

// Item names are stored canonical/lowercase (from the AI normalize); display them
// sentence-cased ("yellow onion" → "Yellow onion") without touching the data.
export function capitalizeName(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// The provenance/meta line under an item name. A multi-source item summarizes how
// many meals it spans (paired with the amber dot); manual/staple items say so.
export function itemMeta(item: GroceryItem): string | null {
  const sourceCount = item.sources?.length ?? 0;
  if (sourceCount > 1) return `${sourceCount} dinners`;
  if (item.sourceType === "staple") return "staple";
  if (item.sourceType === "manual") return "added by you";
  return null;
}
