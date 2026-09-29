/**
 * Text content operations — the TS counterpart of
 * sw/source/core/doc/DocumentContentOperationsManager.cxx (InsertString,
 * DeleteRange, SplitNode, AppendTextNode, CopyRange).
 *
 * Every operation is pure: it takes a document and returns a new one plus
 * the resulting cursor position.
 */
import type { SvxCharAttrs } from "../../../../editeng/source/items/textitem";
import type { SwDoc } from "../../../inc/doc";
import { newNodeId, nodeLength, type SwTextNode, type SwTextRun } from "../../../inc/ndtxt";
import { pamEnd, pamStart, type SwPaM, type SwPosition } from "../../../inc/pam";
import { attrsAt, insertRuns, normalizeRuns, sliceRuns } from "../txtnode/thints";
import { getParaStyle } from "./DocumentStylePoolManager";

export interface SwEditResult {
  readonly doc: SwDoc;
  readonly pos: SwPosition;
}

function replaceNodes(
  doc: SwDoc,
  from: number,
  to: number,
  nodes: readonly SwTextNode[],
): SwDoc {
  return { ...doc, nodes: [...doc.nodes.slice(0, from), ...nodes, ...doc.nodes.slice(to + 1)] };
}

/** SwDoc::InsertString — inserts text inside one paragraph. */
export function insertText(
  doc: SwDoc,
  at: SwPosition,
  text: string,
  attrs?: SvxCharAttrs,
): SwEditResult {
  const node = doc.nodes[at.node];
  const runs = insertRuns(node.runs, at.offset, [
    { text, attrs: attrs ?? attrsAt(node.runs, at.offset) },
  ]);
  return {
    doc: replaceNodes(doc, at.node, at.node, [{ ...node, runs }]),
    pos: { node: at.node, offset: at.offset + text.length },
  };
}

/** DeleteRange — removes the selected text, joining paragraphs as needed. */
export function deleteRange(doc: SwDoc, pam: SwPaM): SwEditResult {
  const s = pamStart(pam);
  const e = pamEnd(pam);
  if (s.node === e.node && s.offset === e.offset) return { doc, pos: s };
  const first = doc.nodes[s.node];
  const last = doc.nodes[e.node];
  const runs = normalizeRuns([
    ...sliceRuns(first.runs, 0, s.offset),
    ...sliceRuns(last.runs, e.offset, nodeLength(last)),
  ]);
  return { doc: replaceNodes(doc, s.node, e.node, [{ ...first, runs }]), pos: s };
}

/** Splits a node's runs at `offset` without applying any "next style". */
function splitRuns(node: SwTextNode, offset: number): [SwTextRun[], SwTextRun[]] {
  return [sliceRuns(node.runs, 0, offset), sliceRuns(node.runs, offset, nodeLength(node))];
}

/** SwDoc::SplitNode — Enter. Applies the style's "next style" at the end. */
export function splitNode(doc: SwDoc, at: SwPosition): SwEditResult {
  const node = doc.nodes[at.node];
  const len = nodeLength(node);
  const [head, tail] = splitRuns(node, at.offset);
  const style = getParaStyle(node.style);
  const atEnd = at.offset === len && len > 0;
  const { pageBreakBefore: _pb, ...tailAttrs } = node.attrs;
  const tailNode: SwTextNode = {
    id: newNodeId(),
    style: atEnd && style.next ? style.next : node.style,
    attrs: tailAttrs,
    runs: tail,
  };
  return {
    doc: replaceNodes(doc, at.node, at.node, [{ ...node, runs: head }, tailNode]),
    pos: { node: at.node + 1, offset: 0 },
  };
}

/**
 * Inserts a fragment of paragraphs at `at` (paste). The first fragment
 * paragraph is merged into the paragraph at the insert position; the last
 * one absorbs the text after it.
 */
export function insertNodes(
  doc: SwDoc,
  at: SwPosition,
  fragment: readonly SwTextNode[],
): SwEditResult {
  if (fragment.length === 0) return { doc, pos: at };
  const node = doc.nodes[at.node];
  const [head, tail] = splitRuns(node, at.offset);
  const first = fragment[0];
  if (fragment.length === 1) {
    const runs = normalizeRuns([...head, ...first.runs, ...tail]);
    return {
      doc: replaceNodes(doc, at.node, at.node, [{ ...node, runs }]),
      pos: { node: at.node, offset: at.offset + nodeLength(first) },
    };
  }
  const last = fragment[fragment.length - 1];
  const nodes: SwTextNode[] = [
    { ...node, runs: normalizeRuns([...head, ...first.runs]) },
    ...fragment.slice(1, -1).map((n) => ({ ...n, id: newNodeId() })),
    { ...last, id: newNodeId(), runs: normalizeRuns([...last.runs, ...tail]) },
  ];
  return {
    doc: replaceNodes(doc, at.node, at.node, nodes),
    pos: { node: at.node + fragment.length - 1, offset: nodeLength(last) },
  };
}

/** Copies the selected range out as a paragraph fragment (for the clipboard). */
export function copyRange(doc: SwDoc, pam: SwPaM): SwTextNode[] {
  const s = pamStart(pam);
  const e = pamEnd(pam);
  const out: SwTextNode[] = [];
  for (let i = s.node; i <= e.node; i++) {
    const n = doc.nodes[i];
    const from = i === s.node ? s.offset : 0;
    const to = i === e.node ? e.offset : nodeLength(n);
    out.push({ ...n, runs: sliceRuns(n.runs, from, to) });
  }
  return out;
}
