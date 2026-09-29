/**
 * Paragraph style pool — mirrors sw/source/core/doc/DocumentStylePoolManager.cxx,
 * which creates Writer's built-in paragraph styles (SwTextFormatColl) on
 * demand. Names are the programmatic (ODF) names; `uiName` is what the UI
 * shows.
 */
import type { SvxCharAttrs } from "../../../../editeng/source/items/textitem";
import type { SvxParaAttrs } from "../../../../editeng/source/items/paraitem";
import type { SwTextNode } from "../../../inc/ndtxt";

export interface SwTextFormatColl {
  readonly name: string;
  readonly uiName: string;
  readonly parent?: string;
  /** Style given to the new paragraph when pressing Enter at the end. */
  readonly next?: string;
  /** Outline level for headings (text:h). */
  readonly outlineLevel?: number;
  readonly char: SvxCharAttrs;
  readonly para: SvxParaAttrs;
}

export const DEFAULT_STYLE = "Standard";
export const BODY_TEXT_STYLE = "Text_20_body";

export const PARA_STYLE_POOL: readonly SwTextFormatColl[] = [
  {
    name: DEFAULT_STYLE,
    uiName: "Default Paragraph Style",
    char: { fontName: "Liberation Serif", fontSize: 12 },
    para: { adjust: "left", spaceBefore: 0, spaceAfter: 0, lineHeight: 100 },
  },
  {
    name: BODY_TEXT_STYLE,
    uiName: "Body Text",
    parent: DEFAULT_STYLE,
    char: {},
    para: { spaceAfter: 7, lineHeight: 115 },
  },
  {
    name: "Heading",
    uiName: "Heading",
    parent: DEFAULT_STYLE,
    next: BODY_TEXT_STYLE,
    char: { fontName: "Liberation Sans", fontSize: 14 },
    para: { spaceBefore: 12, spaceAfter: 6 },
  },
  {
    name: "Heading_20_1",
    uiName: "Heading 1",
    parent: "Heading",
    next: BODY_TEXT_STYLE,
    outlineLevel: 1,
    char: { fontSize: 18, bold: true },
    para: {},
  },
  {
    name: "Heading_20_2",
    uiName: "Heading 2",
    parent: "Heading",
    next: BODY_TEXT_STYLE,
    outlineLevel: 2,
    char: { fontSize: 16, bold: true },
    para: { spaceBefore: 10 },
  },
  {
    name: "Heading_20_3",
    uiName: "Heading 3",
    parent: "Heading",
    next: BODY_TEXT_STYLE,
    outlineLevel: 3,
    char: { fontSize: 14, bold: true },
    para: { spaceBefore: 7 },
  },
  {
    name: "Title",
    uiName: "Title",
    parent: "Heading",
    next: "Subtitle",
    char: { fontSize: 28, bold: true },
    para: { adjust: "center" },
  },
  {
    name: "Subtitle",
    uiName: "Subtitle",
    parent: "Heading",
    next: BODY_TEXT_STYLE,
    char: { fontSize: 18 },
    para: { adjust: "center", spaceBefore: 3, spaceAfter: 6 },
  },
  {
    name: "Quotations",
    uiName: "Quotations",
    parent: DEFAULT_STYLE,
    char: {},
    para: { leftMargin: 1, rightMargin: 1, spaceAfter: 7 },
  },
  {
    name: "Preformatted_20_Text",
    uiName: "Preformatted Text",
    parent: DEFAULT_STYLE,
    char: { fontName: "Liberation Mono", fontSize: 10 },
    para: { spaceAfter: 0 },
  },
];

const byName = new Map(PARA_STYLE_POOL.map((s) => [s.name, s]));
const byUiName = new Map(PARA_STYLE_POOL.map((s) => [s.uiName, s]));

export function getParaStyle(name: string): SwTextFormatColl {
  return byName.get(name) ?? byName.get(DEFAULT_STYLE)!;
}

export function hasParaStyle(name: string): boolean {
  return byName.has(name);
}

export function findParaStyleByUiName(uiName: string): SwTextFormatColl | undefined {
  return byUiName.get(uiName);
}

interface ResolvedStyle {
  char: SvxCharAttrs;
  para: SvxParaAttrs;
}

const resolved = new Map<string, ResolvedStyle>();

/** Style attributes with the parent chain applied (SwFormat::GetAttrSet). */
export function resolveParaStyle(name: string): ResolvedStyle {
  let r = resolved.get(name);
  if (!r) {
    const style = getParaStyle(name);
    const base = style.parent ? resolveParaStyle(style.parent) : { char: {}, para: {} };
    r = { char: { ...base.char, ...style.char }, para: { ...base.para, ...style.para } };
    resolved.set(name, r);
  }
  return r;
}

/** Character attributes after applying the paragraph style underneath. */
export function effectiveCharAttrs(style: string, direct: SvxCharAttrs): SvxCharAttrs {
  return { ...resolveParaStyle(style).char, ...direct };
}

export function effectiveParaAttrs(node: SwTextNode): SvxParaAttrs {
  return { ...resolveParaStyle(node.style).para, ...node.attrs };
}
