/**
 * SwTextNode — a paragraph. Upstream (sw/inc/ndtxt.hxx) text is an OUString
 * with attribute "hints" (SwpHints) layered on top; here the text is stored
 * as attribute runs, which keeps immutable updates simple. The run list is
 * always normalised (see thints.ts): adjacent runs never share attributes,
 * and only an empty paragraph has a single empty run (to remember the
 * attributes the next typed character will get).
 *
 * Inside a paragraph "\n" is a manual line break and "\t" a tab.
 */
import type { SvxCharAttrs } from "../../editeng/source/items/textitem";
import type { SvxParaAttrs } from "../../editeng/source/items/paraitem";

export interface SwTextRun {
  readonly text: string;
  readonly attrs: SvxCharAttrs;
}

export interface SwTextNode {
  /** Stable identity across edits; used as the React key of its frame. */
  readonly id: string;
  /** Programmatic name of the paragraph style (SwTextFormatColl). */
  readonly style: string;
  /** Direct paragraph formatting. */
  readonly attrs: SvxParaAttrs;
  readonly runs: readonly SwTextRun[];
}

let nextId = 1;
export function newNodeId(): string {
  return `n${nextId++}`;
}

export function makeTextNode(
  text = "",
  style = "Standard",
  attrs: SvxParaAttrs = {},
  charAttrs: SvxCharAttrs = {},
): SwTextNode {
  return { id: newNodeId(), style, attrs, runs: [{ text, attrs: charAttrs }] };
}

export function getNodeText(node: SwTextNode): string {
  return node.runs.map((r) => r.text).join("");
}

export function nodeLength(node: SwTextNode): number {
  let n = 0;
  for (const r of node.runs) n += r.text.length;
  return n;
}
