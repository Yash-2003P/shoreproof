export const ICC_CATEGORIES = [
  "Beverage Bottles (Plastic)",
  "Beverage Cans",
  "Caps & Lids",
  "Cigarette Butts",
  "Food Wrappers",
  "Cups & Plates",
  "Straws & Stirrers",
  "Glass Beverage Bottles",
  "Other Plastic Bags",
  "Fishing Gear",
  "Rope & Net",
  "Other Trash",
  "Not sure",
] as const;

export type IccCategory = (typeof ICC_CATEGORIES)[number];

export function isIccCategory(value: string): value is IccCategory {
  return (ICC_CATEGORIES as readonly string[]).includes(value);
}
