import {
  GROCERY_CATEGORIES,
  CATEGORY_LABELS,
  type GroceryCategory,
} from "@/lib/grocery-categories";
import type { GroceryItem } from "./use-grocery-mutations";
import { formatQty, capitalizeName } from "./grocery-format";

// The V1 "get it out of the app" fallback: the whole list as grouped plain text,
// ready to paste into Notes / a text to a partner. Aisle order, quantities in
// parens, checked items marked done so a shared copy stays useful mid-shop.
export function formatListForClipboard(items: GroceryItem[]): string {
  const byCategory = new Map<GroceryCategory, GroceryItem[]>();
  for (const item of items) {
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item);
    byCategory.set(item.category, bucket);
  }

  const lines: string[] = ["Groceries — this week", ""];
  for (const category of GROCERY_CATEGORIES) {
    const group = byCategory.get(category);
    if (!group || group.length === 0) continue;
    lines.push(CATEGORY_LABELS[category].toUpperCase());
    for (const item of group) {
      const qty = formatQty(item.quantity, item.unit);
      const mark = item.isChecked ? "✓ " : "- ";
      lines.push(qty ? `${mark}${capitalizeName(item.name)} (${qty})` : `${mark}${capitalizeName(item.name)}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
