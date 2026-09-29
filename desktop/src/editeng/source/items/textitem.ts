/**
 * Character attributes — the TypeScript counterpart of editeng's `Svx*Item`
 * family (SvxWeightItem, SvxPostureItem, SvxUnderlineItem, SvxFontItem, …).
 *
 * Upstream each attribute is a separate pool item keyed by a Which-ID; here a
 * plain object plays the role of an `SfxItemSet`. An explicit `false` is
 * meaningful: it overrides a value inherited from the paragraph style (e.g.
 * un-bolding part of a heading).
 */
export interface SvxCharAttrs {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeout?: boolean;
  escapement?: "super" | "sub" | "none";
  /** Font family name. */
  fontName?: string;
  /** Font size in points. */
  fontSize?: number;
  /** Font colour as `#rrggbb`. */
  color?: string;
  /** Character highlighting (background) as `#rrggbb`. */
  highlight?: string;
}

export type SvxCharAttrKey = keyof SvxCharAttrs;

/** Drops keys whose value is `undefined` so that set comparison is exact. */
export function normalizeCharAttrs(attrs: SvxCharAttrs): SvxCharAttrs {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) out[k] = v;
  return out as SvxCharAttrs;
}

export function charAttrsEqual(a: SvxCharAttrs, b: SvxCharAttrs): boolean {
  if (a === b) return true;
  const ka = Object.keys(a).filter((k) => a[k as SvxCharAttrKey] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k as SvxCharAttrKey] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k as SvxCharAttrKey] === b[k as SvxCharAttrKey]);
}
