/**
 * Text search — counterpart of sw/source/core/crsr/findtxt.cxx
 * (SwPaM::Find with i18nutil::SearchOptions2). Searches paragraph by
 * paragraph and wraps around the document.
 */
import type { SwDoc } from "../../../inc/doc";
import { getNodeText } from "../../../inc/ndtxt";
import type { SwPaM, SwPosition } from "../../../inc/pam";

export interface SvxSearchOptions {
  matchCase?: boolean;
  wholeWords?: boolean;
  backwards?: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matcher(needle: string, opts: SvxSearchOptions): RegExp {
  const body = escapeRegExp(needle);
  return new RegExp(opts.wholeWords ? `(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])` : body, opts.matchCase ? "gu" : "giu");
}

function matchesIn(text: string, re: RegExp): [number, number][] {
  const out: [number, number][] = [];
  re.lastIndex = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

/** Finds the next match after (or before, when backwards) `from`. */
export function findText(
  doc: SwDoc,
  from: SwPosition,
  needle: string,
  opts: SvxSearchOptions = {},
): SwPaM | null {
  if (!needle) return null;
  const re = matcher(needle, opts);
  const n = doc.nodes.length;
  for (let step = 0; step <= n; step++) {
    const idx = opts.backwards ? (from.node - step + n * 2) % n : (from.node + step) % n;
    const hits = matchesIn(getNodeText(doc.nodes[idx]), re);
    const ordered = opts.backwards ? hits.reverse() : hits;
    for (const [s, e] of ordered) {
      if (step === 0 && !opts.backwards && s < from.offset) continue;
      if (step === 0 && opts.backwards && e > from.offset) continue;
      if (step === n && !opts.backwards && s >= from.offset) continue;
      if (step === n && opts.backwards && e <= from.offset) continue;
      return opts.backwards
        ? { mark: { node: idx, offset: e }, point: { node: idx, offset: s } }
        : { mark: { node: idx, offset: s }, point: { node: idx, offset: e } };
    }
  }
  return null;
}

/** All matches in document order. */
export function findAll(doc: SwDoc, needle: string, opts: SvxSearchOptions = {}): SwPaM[] {
  if (!needle) return [];
  const re = matcher(needle, opts);
  const out: SwPaM[] = [];
  doc.nodes.forEach((node, idx) => {
    for (const [s, e] of matchesIn(getNodeText(node), re)) {
      out.push({ mark: { node: idx, offset: s }, point: { node: idx, offset: e } });
    }
  });
  return out;
}
