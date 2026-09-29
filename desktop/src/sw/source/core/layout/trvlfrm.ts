/**
 * Mapping between view positions and model positions — the job of
 * SwLayoutFrame::GetModelPositionForViewPoint / SwTextFrame::GetCharRect in
 * sw/source/core/layout/trvlfrm.cxx. Here "view positions" are DOM
 * (node, offset) boundary points inside the frames rendered by SwTextFrame.
 */
import type { SwPaM, SwPosition } from "../../../inc/pam";

const PARA = "[data-sw-node]";

function paraIndex(el: Element): number {
  return Number(el.getAttribute("data-sw-node"));
}

function textContainer(para: Element): Element {
  return para.querySelector(".sw-txt") ?? para;
}

function textLength(el: Element): number {
  let n = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) n += walker.currentNode.nodeValue?.length ?? 0;
  return n;
}

/** DOM boundary point → model position, or null if outside the document. */
export function domToPos(root: Element, node: Node, offset: number): SwPosition | null {
  if (!root.contains(node)) return null;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const para = el?.closest(PARA);
  if (para && root.contains(para)) {
    const txt = textContainer(para);
    if (!txt.contains(node)) {
      // The paragraph box itself (outside its text): start or end.
      return { node: paraIndex(para), offset: offset === 0 ? 0 : textLength(txt) };
    }
    const range = document.createRange();
    range.setStart(txt, 0);
    range.setEnd(node, offset);
    return { node: paraIndex(para), offset: range.toString().length };
  }
  // Between paragraphs (page boxes, gaps): snap to the next paragraph's
  // start, or the end of the last one.
  const point = document.createRange();
  point.setStart(node, offset);
  const paras = root.querySelectorAll(PARA);
  for (const p of Array.from(paras)) {
    if (point.comparePoint(p, 0) > 0) return { node: paraIndex(p), offset: 0 };
  }
  const last = paras[paras.length - 1];
  return last ? { node: paraIndex(last), offset: textLength(textContainer(last)) } : null;
}

/** Model position → DOM boundary point. */
export function posToDom(root: Element, pos: SwPosition): [Node, number] | null {
  const para = root.querySelector(`[data-sw-node="${pos.node}"]`);
  if (!para) return null;
  const txt = textContainer(para);
  const walker = document.createTreeWalker(txt, NodeFilter.SHOW_TEXT);
  let remaining = pos.offset;
  let last: Text | null = null;
  while (walker.nextNode()) {
    const t = walker.currentNode as Text;
    if (remaining <= t.length) return [t, remaining];
    remaining -= t.length;
    last = t;
  }
  return last ? [last, last.length] : [txt, 0];
}

export function readDomSelection(root: Element): SwPaM | null {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !sel.focusNode) return null;
  const mark = domToPos(root, sel.anchorNode, sel.anchorOffset);
  const point = domToPos(root, sel.focusNode, sel.focusOffset);
  return mark && point ? { mark, point } : null;
}

export function writeDomSelection(root: Element, pam: SwPaM): void {
  const sel = document.getSelection();
  const a = posToDom(root, pam.mark);
  const f = posToDom(root, pam.point);
  if (sel && a && f) sel.setBaseAndExtent(a[0], a[1], f[0], f[1]);
}

export function pamToRange(root: Element, pam: SwPaM): Range | null {
  const a = posToDom(root, pam.mark);
  const f = posToDom(root, pam.point);
  if (!a || !f) return null;
  const r = document.createRange();
  r.setStart(a[0], a[1]);
  r.setEnd(f[0], f[1]);
  if (r.collapsed && (a[0] !== f[0] || a[1] !== f[1])) {
    // mark was after point: swap
    r.setStart(f[0], f[1]);
    r.setEnd(a[0], a[1]);
  }
  return r;
}

/** Client rect of the cursor position (SwCursorShell::GetCharRect). */
export function caretRect(root: Element, pos: SwPosition): DOMRect | null {
  const p = posToDom(root, pos);
  if (!p) return null;
  const r = document.createRange();
  r.setStart(p[0], p[1]);
  r.collapse(true);
  const rect = r.getBoundingClientRect();
  if (rect.height > 0) return rect;
  return root.querySelector(`[data-sw-node="${pos.node}"] .sw-txt`)?.getBoundingClientRect() ?? null;
}
