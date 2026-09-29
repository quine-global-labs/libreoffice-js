/**
 * SwWrtShell — the editing API the UI talks to (sw/source/uibase/wrtsh/).
 * Upstream it layers cursor handling (SwCursorShell), editing (SwEditShell)
 * and view concerns on top of SwDoc. Here it owns the current document
 * snapshot, the cursor (SwPaM), pending input attributes and undo, and lets
 * React subscribe to changes (useSyncExternalStore).
 */
import type { SvxCharAttrs } from "../../../../editeng/source/items/textitem";
import {
  INDENT_STEP_CM,
  MAX_LIST_LEVEL,
  type SvxParaAttrs,
  type SwListKind,
} from "../../../../editeng/source/items/paraitem";
import type { SwDoc } from "../../../inc/doc";
import { getNodeText, nodeLength, type SwTextNode } from "../../../inc/ndtxt";
import {
  clampPaM,
  collapsed,
  docEnd,
  hasSelection,
  pamEnd,
  pamEquals,
  pamStart,
  pos,
  posEquals,
  type SwPaM,
  type SwPosition,
} from "../../../inc/pam";
import { findAll, findText, type SvxSearchOptions } from "../../core/crsr/findtxt";
import {
  copyRange,
  deleteRange,
  insertNodes,
  insertText,
  splitNode,
} from "../../core/doc/DocumentContentOperationsManager";
import {
  effectiveCharAttrs,
  effectiveParaAttrs,
} from "../../core/doc/DocumentStylePoolManager";
import {
  formatParas,
  resetCharAttrs,
  setCharAttrs,
  setParaAttrs,
  setParaStyle,
} from "../../core/doc/docfmt";
import { createDoc } from "../../core/doc/docnew";
import { attrsAt, attrsOfCharAt } from "../../core/txtnode/thints";
import { SwUndoManager } from "../../core/undo/UndoManager";

export interface SwShellSnapshot {
  readonly doc: SwDoc;
  readonly pam: SwPaM;
  /** Attributes set with a collapsed cursor, applied to the next input. */
  readonly pending: SvxCharAttrs | null;
  readonly modified: boolean;
  readonly undoComment?: string;
  readonly redoComment?: string;
}

type Listener = () => void;

const graphemes =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function prevBoundary(text: string, offset: number): number {
  if (!graphemes) return offset - 1;
  let prev = 0;
  for (const seg of graphemes.segment(text)) {
    if (seg.index >= offset) break;
    prev = seg.index;
  }
  return prev;
}

function nextBoundary(text: string, offset: number): number {
  if (!graphemes) return offset + 1;
  for (const seg of graphemes.segment(text)) {
    if (seg.index > offset) return seg.index;
  }
  return text.length;
}

const WORD_CHAR = /[\p{L}\p{N}_]/u;

/** Word around a collapsed cursor, if the cursor is strictly inside one. */
function wordAround(text: string, offset: number): [number, number] | null {
  if (offset === 0 || offset >= text.length) return null;
  if (!WORD_CHAR.test(text[offset - 1]) || !WORD_CHAR.test(text[offset])) return null;
  let s = offset;
  let e = offset;
  while (s > 0 && WORD_CHAR.test(text[s - 1])) s--;
  while (e < text.length && WORD_CHAR.test(text[e])) e++;
  return [s, e];
}

export class SwWrtShell {
  private state: SwShellSnapshot;
  private readonly listeners = new Set<Listener>();
  private readonly undoManager = new SwUndoManager();

  constructor(doc: SwDoc = createDoc()) {
    this.state = { doc, pam: collapsed(pos(0, 0)), pending: null, modified: false };
  }

  // --- React store plumbing -------------------------------------------------

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SwShellSnapshot => this.state;

  get doc(): SwDoc {
    return this.state.doc;
  }

  get pam(): SwPaM {
    return this.state.pam;
  }

  private commit(
    next: { doc?: SwDoc; pam?: SwPaM; pending?: SvxCharAttrs | null; modified?: boolean },
    undo?: { comment: string; group?: string },
  ): void {
    if (undo) {
      this.undoManager.record({ doc: this.state.doc, pam: this.state.pam }, undo.comment, undo.group);
    }
    const doc = next.doc ?? this.state.doc;
    this.state = {
      doc,
      pam: clampPaM(doc, next.pam ?? this.state.pam),
      pending: next.pending === undefined ? this.state.pending : next.pending,
      modified: next.modified ?? (undo ? true : this.state.modified),
      undoComment: this.undoManager.undoComment,
      redoComment: this.undoManager.redoComment,
    };
    for (const l of this.listeners) l();
  }

  /** Replaces the document (File > New / Open). */
  load(doc: SwDoc): void {
    this.undoManager.clear();
    this.commit({ doc, pam: collapsed(pos(0, 0)), pending: null, modified: false });
  }

  setModified(modified: boolean): void {
    if (modified !== this.state.modified) this.commit({ modified });
  }

  // --- Cursor ---------------------------------------------------------------

  setSelection(pam: SwPaM): void {
    const next = clampPaM(this.state.doc, pam);
    if (pamEquals(next, this.state.pam)) return;
    this.undoManager.breakGroup();
    this.commit({ pam: next, pending: null });
  }

  selectAll(): void {
    this.setSelection({ mark: pos(0, 0), point: docEnd(this.state.doc) });
  }

  getSelectedText(): string {
    return copyRange(this.state.doc, this.state.pam).map(getNodeText).join("\n");
  }

  // --- Text input -----------------------------------------------------------

  /** Types `text` over the selection (SwWrtShell::Insert). */
  insert(text: string): void {
    this.replaceRange(this.state.pam, text, "Typing", "typing");
  }

  /** Replaces `pam` with `text` using the attributes at its start. */
  replaceRange(pam: SwPaM, text: string, comment = "Replace", group?: string): void {
    const del = deleteRange(this.state.doc, pam);
    const node = del.doc.nodes[del.pos.node];
    const base = hasSelection(pam)
      ? attrsOfCharAt(this.state.doc.nodes[pamStart(pam).node].runs, pamStart(pam).offset)
      : attrsAt(node.runs, del.pos.offset);
    const attrs = this.state.pending ? { ...base, ...this.state.pending } : base;
    const ins = text ? insertText(del.doc, del.pos, text, attrs) : del;
    this.commit({ doc: ins.doc, pam: collapsed(ins.pos), pending: null }, { comment, group });
  }

  /** Enter (SwWrtShell::SplitNode). An empty list item leaves the list. */
  splitNode(): void {
    const { doc, pam } = this.state;
    const node = doc.nodes[pam.point.node];
    if (!hasSelection(pam) && node.attrs.list && nodeLength(node) === 0) {
      this.setListKind(undefined);
      return;
    }
    const del = deleteRange(doc, pam);
    const split = splitNode(del.doc, del.pos);
    this.commit({ doc: split.doc, pam: collapsed(split.pos) }, { comment: "New paragraph" });
  }

  /** Shift+Enter. */
  insertLineBreak(): void {
    this.replaceRange(this.state.pam, "\n", "Insert line break");
  }

  /** Ctrl+Enter (SwWrtShell::InsertPageBreak). */
  insertPageBreak(): void {
    const del = deleteRange(this.state.doc, this.state.pam);
    const split = splitNode(del.doc, del.pos);
    const doc = setParaAttrs(split.doc, collapsed(split.pos), { pageBreakBefore: true });
    this.commit({ doc, pam: collapsed(split.pos) }, { comment: "Insert page break" });
  }

  /** Backspace (SwWrtShell::DelLeft). */
  delLeft(): void {
    const { doc, pam } = this.state;
    if (hasSelection(pam)) return this.deleteRange(pam);
    const p = pam.point;
    const node = doc.nodes[p.node];
    if (p.offset > 0) {
      const from = prevBoundary(getNodeText(node), p.offset);
      return this.deleteRange({ mark: pos(p.node, from), point: p }, "typing");
    }
    // At the paragraph start: leave the list first, then drop direct
    // indentation / page break, then join with the previous paragraph.
    if (node.attrs.list) return this.setListKind(undefined);
    if (p.node > 0) {
      const prev = doc.nodes[p.node - 1];
      this.deleteRange({ mark: pos(p.node - 1, nodeLength(prev)), point: p });
    }
  }

  /** Delete (SwWrtShell::DelRight). */
  delRight(): void {
    const { doc, pam } = this.state;
    if (hasSelection(pam)) return this.deleteRange(pam);
    const p = pam.point;
    const node = doc.nodes[p.node];
    const len = nodeLength(node);
    if (p.offset < len) {
      const to = nextBoundary(getNodeText(node), p.offset);
      return this.deleteRange({ mark: p, point: pos(p.node, to) }, "delete");
    }
    if (p.node < doc.nodes.length - 1) this.deleteRange({ mark: p, point: pos(p.node + 1, 0) });
  }

  deleteRange(pam: SwPaM, group?: string): void {
    if (!hasSelection(pam)) return;
    const res = deleteRange(this.state.doc, pam);
    this.commit({ doc: res.doc, pam: collapsed(res.pos), pending: null }, { comment: "Delete", group });
  }

  // --- Clipboard ------------------------------------------------------------

  copySelection(): SwTextNode[] {
    return copyRange(this.state.doc, this.state.pam);
  }

  /** Pastes a paragraph fragment over the selection. */
  insertFragment(fragment: readonly SwTextNode[], comment = "Paste"): void {
    if (fragment.length === 0) return;
    const del = deleteRange(this.state.doc, this.state.pam);
    const ins = insertNodes(del.doc, del.pos, fragment);
    this.commit({ doc: ins.doc, pam: collapsed(ins.pos), pending: null }, { comment });
  }

  /** Pastes plain text; line breaks become paragraphs in the current style. */
  insertPlainText(text: string): void {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    if (lines.length === 1) return this.replaceRange(this.state.pam, text, "Paste");
    const start = pamStart(this.state.pam);
    const cur = this.state.doc.nodes[start.node];
    const attrs = attrsAt(cur.runs, start.offset);
    const { pageBreakBefore: _pb, ...paraAttrs } = cur.attrs;
    this.insertFragment(
      lines.map((line) => ({
        id: "",
        style: cur.style,
        attrs: paraAttrs,
        runs: [{ text: line, attrs }],
      })),
    );
  }

  // --- Character attributes -------------------------------------------------

  /** Effective character attributes at the cursor (style + direct + pending). */
  getCharAttrs(): SvxCharAttrs {
    const { doc, pam, pending } = this.state;
    const start = hasSelection(pam) ? pamStart(pam) : pam.point;
    const node = doc.nodes[start.node];
    const direct = hasSelection(pam)
      ? attrsOfCharAt(node.runs, start.offset)
      : attrsAt(node.runs, start.offset);
    return effectiveCharAttrs(node.style, { ...direct, ...pending });
  }

  /**
   * Applies attributes to the selection. With a collapsed cursor inside a
   * word Writer formats the whole word; otherwise the attributes are kept
   * pending for the next input.
   */
  setCharAttrs(patch: SvxCharAttrs, comment = "Apply attributes"): void {
    const target = this.formatTarget();
    if (!target) {
      this.commit({ pending: { ...this.state.pending, ...patch } });
      return;
    }
    this.commit({ doc: setCharAttrs(this.state.doc, target, patch) }, { comment });
  }

  toggleCharAttr(key: "bold" | "italic" | "underline" | "strikeout"): void {
    this.setCharAttrs({ [key]: !this.getCharAttrs()[key] });
  }

  toggleEscapement(kind: "super" | "sub"): void {
    this.setCharAttrs({ escapement: this.getCharAttrs().escapement === kind ? "none" : kind });
  }

  /** Format > Clear Direct Formatting. */
  resetCharAttrs(): void {
    const target = this.formatTarget();
    if (!target) {
      this.commit({ pending: null });
      return;
    }
    this.commit(
      { doc: resetCharAttrs(this.state.doc, target), pending: null },
      { comment: "Reset attributes" },
    );
  }

  private formatTarget(): SwPaM | null {
    const { doc, pam } = this.state;
    if (hasSelection(pam)) return pam;
    const word = wordAround(getNodeText(doc.nodes[pam.point.node]), pam.point.offset);
    return word ? { mark: pos(pam.point.node, word[0]), point: pos(pam.point.node, word[1]) } : null;
  }

  // --- Paragraph attributes -------------------------------------------------

  getParaAttrs(): SvxParaAttrs {
    return effectiveParaAttrs(this.state.doc.nodes[this.state.pam.point.node]);
  }

  getParaStyle(): string {
    return this.state.doc.nodes[this.state.pam.point.node].style;
  }

  setParaAttrs(patch: SvxParaAttrs, comment = "Apply paragraph attributes"): void {
    this.commit({ doc: setParaAttrs(this.state.doc, this.state.pam, patch) }, { comment });
  }

  setParaStyle(style: string): void {
    this.commit({ doc: setParaStyle(this.state.doc, this.state.pam, style) }, { comment: "Apply Styles" });
  }

  /** Numbering on/off (FN_NUM_BULLET_ON / FN_NUM_NUMBERING_ON). */
  toggleList(kind: SwListKind): void {
    const { doc, pam } = this.state;
    const s = pamStart(pam).node;
    const e = pamEnd(pam).node;
    const all = doc.nodes.slice(s, e + 1).every((n) => n.attrs.list === kind);
    this.setListKind(all ? undefined : kind);
  }

  private setListKind(kind: SwListKind | undefined): void {
    const doc = formatParas(this.state.doc, this.state.pam, (n) => ({
      ...n,
      attrs: { ...n.attrs, list: kind, listLevel: kind ? (n.attrs.listLevel ?? 1) : undefined },
    }));
    this.commit({ doc }, { comment: kind ? "Apply numbering" : "Numbering off" });
  }

  /** Increase/Decrease Indent; demotes/promotes list items. */
  changeIndent(delta: 1 | -1): void {
    const doc = formatParas(this.state.doc, this.state.pam, (n) => {
      if (n.attrs.list) {
        const level = Math.max(1, Math.min(MAX_LIST_LEVEL, (n.attrs.listLevel ?? 1) + delta));
        return { ...n, attrs: { ...n.attrs, listLevel: level } };
      }
      const lm = Math.max(0, (n.attrs.leftMargin ?? 0) + delta * INDENT_STEP_CM);
      return { ...n, attrs: { ...n.attrs, leftMargin: lm || undefined } };
    });
    this.commit({ doc }, { comment: "Indent" });
  }

  // --- Undo -----------------------------------------------------------------

  undo(): void {
    const prev = this.undoManager.undo({ doc: this.state.doc, pam: this.state.pam });
    if (prev) this.commit({ doc: prev.doc, pam: prev.pam, pending: null, modified: true });
  }

  redo(): void {
    const next = this.undoManager.redo({ doc: this.state.doc, pam: this.state.pam });
    if (next) this.commit({ doc: next.doc, pam: next.pam, pending: null, modified: true });
  }

  // --- Find & Replace -------------------------------------------------------

  find(needle: string, opts: SvxSearchOptions = {}): boolean {
    const { doc, pam } = this.state;
    const from: SwPosition = opts.backwards ? pamStart(pam) : pamEnd(pam);
    const hit = findText(doc, from, needle, opts);
    if (hit) this.setSelection(hit);
    return !!hit;
  }

  /** Replaces the current match (if selected) and finds the next one. */
  replace(needle: string, replacement: string, opts: SvxSearchOptions = {}): boolean {
    const { doc, pam } = this.state;
    if (hasSelection(pam)) {
      const s = pamStart(pam);
      const hit = findText(doc, s, needle, { ...opts, backwards: false });
      if (hit && posEquals(pamStart(hit), s) && posEquals(pamEnd(hit), pamEnd(pam))) {
        this.replaceRange(pam, replacement, "Replace");
      }
    }
    return this.find(needle, opts);
  }

  /** Replaces every match in one undo step; returns the count. */
  replaceAll(needle: string, replacement: string, opts: SvxSearchOptions = {}): number {
    const hits = findAll(this.state.doc, needle, opts);
    if (hits.length === 0) return 0;
    let doc = this.state.doc;
    for (const hit of [...hits].reverse()) {
      const s = pamStart(hit);
      const attrs = attrsOfCharAt(doc.nodes[s.node].runs, s.offset);
      const del = deleteRange(doc, hit);
      doc = replacement ? insertText(del.doc, del.pos, replacement, attrs).doc : del.doc;
    }
    this.commit({ doc, pam: collapsed(pamStart(hits[0])), pending: null }, { comment: "Replace all" });
    return hits.length;
  }
}
