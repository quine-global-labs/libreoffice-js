/**
 * SwPosition / SwPaM — positions and selections in the document
 * (sw/inc/pam.hxx). A position is a node index plus a character offset; a
 * PaM ("point and mark") is a selection whose `point` is the moving end.
 */
import type { SwDoc } from "./doc";
import { nodeLength } from "./ndtxt";

export interface SwPosition {
  readonly node: number;
  readonly offset: number;
}

export interface SwPaM {
  readonly mark: SwPosition;
  readonly point: SwPosition;
}

export function pos(node: number, offset: number): SwPosition {
  return { node, offset };
}

export function collapsed(p: SwPosition): SwPaM {
  return { mark: p, point: p };
}

export function comparePos(a: SwPosition, b: SwPosition): number {
  return a.node !== b.node ? a.node - b.node : a.offset - b.offset;
}

export function posEquals(a: SwPosition, b: SwPosition): boolean {
  return a.node === b.node && a.offset === b.offset;
}

export function pamEquals(a: SwPaM, b: SwPaM): boolean {
  return posEquals(a.mark, b.mark) && posEquals(a.point, b.point);
}

/** True if the selection spans text (SwPaM::HasMark && mark != point). */
export function hasSelection(pam: SwPaM): boolean {
  return !posEquals(pam.mark, pam.point);
}

export function pamStart(pam: SwPaM): SwPosition {
  return comparePos(pam.mark, pam.point) <= 0 ? pam.mark : pam.point;
}

export function pamEnd(pam: SwPaM): SwPosition {
  return comparePos(pam.mark, pam.point) <= 0 ? pam.point : pam.mark;
}

export function clampPos(doc: SwDoc, p: SwPosition): SwPosition {
  const node = Math.max(0, Math.min(p.node, doc.nodes.length - 1));
  const offset = Math.max(0, Math.min(p.offset, nodeLength(doc.nodes[node])));
  return node === p.node && offset === p.offset ? p : { node, offset };
}

export function clampPaM(doc: SwDoc, pam: SwPaM): SwPaM {
  const mark = clampPos(doc, pam.mark);
  const point = clampPos(doc, pam.point);
  return mark === pam.mark && point === pam.point ? pam : { mark, point };
}

export function docEnd(doc: SwDoc): SwPosition {
  const node = doc.nodes.length - 1;
  return { node, offset: nodeLength(doc.nodes[node]) };
}
