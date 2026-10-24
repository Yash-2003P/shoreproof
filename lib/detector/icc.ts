import type { IccCategory } from "../icc";

/**
 * A deliberately small allowlist. The detector may only pre-select a
 * category for these COCO classes; everything else stays unmapped until a
 * human picks one.
 */
export const COCO_ICC_MAP: Record<
  number,
  { category: IccCategory; uncertain: boolean }
> = {
  39: { category: "Beverage Bottles (Plastic)", uncertain: false }, // bottle
  40: { category: "Glass Beverage Bottles", uncertain: false }, // wine glass
  41: { category: "Cups & Plates", uncertain: false }, // cup
  45: { category: "Cups & Plates", uncertain: false }, // bowl
  42: { category: "Cups & Plates", uncertain: true }, // fork
  43: { category: "Cups & Plates", uncertain: true }, // knife
  44: { category: "Cups & Plates", uncertain: true }, // spoon
};

export type CocoMapping = {
  category: IccCategory | null;
  uncertain: boolean;
};

export function mapCocoToIcc(cocoId: number): CocoMapping {
  const mapped = COCO_ICC_MAP[cocoId];
  if (!mapped) return { category: null, uncertain: false };
  return { category: mapped.category, uncertain: mapped.uncertain };
}
