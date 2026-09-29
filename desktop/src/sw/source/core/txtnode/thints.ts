/**
 * Attribute-run operations on a paragraph — the role SwpHints / thints.cxx
 * play upstream (inserting, splitting and merging text attributes).
 * Every function returns normalised runs (see ndtxt.ts).
 */
import {
  charAttrsEqual,
  normalizeCharAttrs,
  type SvxCharAttrs,
} from "../../../../editeng/source/items/textitem";
import type { SwTextRun } from "../../../inc/ndtxt";

export function normalizeRuns(runs: readonly SwTextRun[]): SwTextRun[] {
  const out: SwTextRun[] = [];
  for (const r of runs) {
    if (r.text === "") continue;
    const last = out[out.length - 1];
    if (last && charAttrsEqual(last.attrs, r.attrs)) {
      out[out.length - 1] = { text: last.text + r.text, attrs: last.attrs };
    } else {
      out.push({ text: r.text, attrs: normalizeCharAttrs(r.attrs) });
    }
  }
  if (out.length === 0) {
    // Keep the attributes of the (now empty) paragraph for the next input.
    return [{ text: "", attrs: normalizeCharAttrs(runs[0]?.attrs ?? {}) }];
  }
  return out;
}

function runsLength(runs: readonly SwTextRun[]): number {
  let n = 0;
  for (const r of runs) n += r.text.length;
  return n;
}

/** Runs covering [start, end). An empty slice keeps the attrs at `start`. */
export function sliceRuns(
  runs: readonly SwTextRun[],
  start: number,
  end: number,
): SwTextRun[] {
  const out: SwTextRun[] = [];
  let at = 0;
  for (const r of runs) {
    const rs = at;
    const re = at + r.text.length;
    at = re;
    const s = Math.max(start, rs);
    const e = Math.min(end, re);
    if (s < e) out.push({ text: r.text.slice(s - rs, e - rs), attrs: r.attrs });
  }
  if (out.length === 0) return [{ text: "", attrs: attrsAt(runs, start) }];
  return normalizeRuns(out);
}

/**
 * Attributes in effect for input at `offset`: those of the character before
 * it, or of the first character when at the paragraph start (Writer's
 * behaviour when typing).
 */
export function attrsAt(runs: readonly SwTextRun[], offset: number): SvxCharAttrs {
  let at = 0;
  for (const r of runs) {
    const re = at + r.text.length;
    if (offset > at && offset <= re) return r.attrs;
    at = re;
  }
  return runs[0]?.attrs ?? {};
}

/** Attributes of the character *at* `offset` (used for selection state). */
export function attrsOfCharAt(runs: readonly SwTextRun[], offset: number): SvxCharAttrs {
  let at = 0;
  for (const r of runs) {
    const re = at + r.text.length;
    if (offset >= at && offset < re) return r.attrs;
    at = re;
  }
  return attrsAt(runs, offset);
}

export function insertRuns(
  runs: readonly SwTextRun[],
  offset: number,
  inserted: readonly SwTextRun[],
): SwTextRun[] {
  const total = runsLength(runs);
  const head = offset > 0 ? sliceRuns(runs, 0, offset) : [];
  const tail = offset < total ? sliceRuns(runs, offset, total) : [];
  return normalizeRuns([...head, ...inserted, ...tail]);
}

/** Applies `fn` to the attributes of the characters in [start, end). */
export function mapRunAttrs(
  runs: readonly SwTextRun[],
  start: number,
  end: number,
  fn: (attrs: SvxCharAttrs) => SvxCharAttrs,
): SwTextRun[] {
  const total = runsLength(runs);
  if (total === 0) return normalizeRuns([{ text: "", attrs: fn(runs[0]?.attrs ?? {}) }]);
  const mid = sliceRuns(runs, start, end).map((r) => ({ text: r.text, attrs: fn(r.attrs) }));
  return normalizeRuns([
    ...(start > 0 ? sliceRuns(runs, 0, start) : []),
    ...mid,
    ...(end < total ? sliceRuns(runs, end, total) : []),
  ]);
}
