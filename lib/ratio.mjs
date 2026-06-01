export const RATIO_45 = { ratioW: 4, ratioH: 5, ratioKey: "4x5", ratioLabel: "4∶5" };
export const RATIO_916 = { ratioW: 9, ratioH: 16, ratioKey: "9x16", ratioLabel: "9∶16" };

/** Snap to 4∶5 or 9∶16 — whichever is closer. */
export function snapToFixedRatio(width, height) {
  const actual = width / height;
  const r45 = 4 / 5;
  const r916 = 9 / 16;
  const diff45 = Math.abs(actual - r45);
  const diff916 = Math.abs(actual - r916);
  return diff45 <= diff916 ? { ...RATIO_45 } : { ...RATIO_916 };
}
