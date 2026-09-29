/**
 * Attribute application — counterpart of sw/source/core/doc/docfmt.cxx
 * (InsertPoolItem / ResetAttrs / SetTextFormatColl).
 */
import type { SvxCharAttrs } from "../../../../editeng/source/items/textitem";
import type { SvxParaAttrs } from "../../../../editeng/source/items/paraitem";
import type { SwDoc } from "../../../inc/doc";
import { nodeLength, type SwTextNode } from "../../../inc/ndtxt";
import { pamEnd, pamStart, type SwPaM } from "../../../inc/pam";
import { mapRunAttrs } from "../txtnode/thints";

/** Rewrites the character attributes of every character in the selection. */
export function formatChars(
  doc: SwDoc,
  pam: SwPaM,
  fn: (attrs: SvxCharAttrs) => SvxCharAttrs,
): SwDoc {
  const s = pamStart(pam);
  const e = pamEnd(pam);
  const nodes = doc.nodes.slice();
  for (let i = s.node; i <= e.node; i++) {
    const n = nodes[i];
    const len = nodeLength(n);
    const from = i === s.node ? s.offset : 0;
    const to = i === e.node ? e.offset : len;
    if (from < to || len === 0) nodes[i] = { ...n, runs: mapRunAttrs(n.runs, from, to, fn) };
  }
  return { ...doc, nodes };
}

/** Sets (or, with `undefined`, clears) character attributes on a selection. */
export function setCharAttrs(doc: SwDoc, pam: SwPaM, patch: SvxCharAttrs): SwDoc {
  return formatChars(doc, pam, (a) => ({ ...a, ...patch }));
}

/** Format > Clear Direct Formatting (character attributes only). */
export function resetCharAttrs(doc: SwDoc, pam: SwPaM): SwDoc {
  return formatChars(doc, pam, () => ({}));
}

/** Rewrites each paragraph touched by the selection. */
export function formatParas(
  doc: SwDoc,
  pam: SwPaM,
  fn: (node: SwTextNode) => SwTextNode,
): SwDoc {
  const s = pamStart(pam);
  const e = pamEnd(pam);
  const nodes = doc.nodes.slice();
  for (let i = s.node; i <= e.node; i++) nodes[i] = fn(nodes[i]);
  return { ...doc, nodes };
}

export function setParaAttrs(doc: SwDoc, pam: SwPaM, patch: SvxParaAttrs): SwDoc {
  return formatParas(doc, pam, (n) => ({ ...n, attrs: { ...n.attrs, ...patch } }));
}

/** SwDoc::SetTextFormatColl — applying a paragraph style. */
export function setParaStyle(doc: SwDoc, pam: SwPaM, style: string): SwDoc {
  return formatParas(doc, pam, (n) => ({ ...n, style }));
}
