/**
 * ODF import — counterpart of sw/source/filter/xml/swxml.cxx (SwXMLReader)
 * with the text import from xmloff. Reads .odt packages and flat .fodt
 * files. Paragraph styles Writer knows are kept as styles; formatting from
 * automatic and unknown custom styles becomes direct formatting.
 *
 * Not yet imported: tables (their paragraphs are flattened), frames/images,
 * fields (their current text is kept), notes and tracked changes.
 */
import { strFromU8, unzipSync } from "fflate";
import type { SvxCharAttrs } from "../../../../editeng/source/items/textitem";
import type { SvxParaAttrs, SwListKind } from "../../../../editeng/source/items/paraitem";
import { DEFAULT_PAGE_DESC, type SwDoc, type SwPageDesc } from "../../../inc/doc";
import { newNodeId, type SwTextNode, type SwTextRun } from "../../../inc/ndtxt";
import { DEFAULT_STYLE, hasParaStyle } from "../../core/doc/DocumentStylePoolManager";
import { normalizeRuns } from "../../core/txtnode/thints";
import { NS } from "./xmlnmspe";

interface OdfStyle {
  parent?: string;
  para: SvxParaAttrs;
  char: SvxCharAttrs;
}

interface ImportContext {
  paraStyles: Map<string, OdfStyle>;
  textStyles: Map<string, OdfStyle>;
  listStyles: Map<string, SwListKind[]>;
  fonts: Map<string, string>;
  pageDesc: SwPageDesc;
}

const attr = (el: Element, ns: string, name: string) => el.getAttributeNS(ns, name) ?? undefined;
const children = (el: Element) => Array.from(el.children);
const is = (el: Element, ns: string, local: string) => el.namespaceURI === ns && el.localName === local;

/** Parses an ODF length ("2cm", "0.5in", "12pt") into cm. */
export function lengthToCm(v: string | undefined): number | undefined {
  const m = v?.match(/^(-?[\d.]+)(cm|mm|in|pt|pc|px)$/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const factor = { cm: 1, mm: 0.1, in: 2.54, pt: 2.54 / 72, pc: 2.54 / 6, px: 2.54 / 96 }[m[2]]!;
  return n * factor;
}

const cmToPt = (cm: number | undefined) => (cm === undefined ? undefined : +(cm * (72 / 2.54)).toFixed(2));

function parseParaProps(el: Element | undefined): SvxParaAttrs {
  if (!el) return {};
  const p: SvxParaAttrs = {};
  const align = attr(el, NS.fo, "text-align");
  if (align) {
    p.adjust = ({ start: "left", left: "left", end: "right", right: "right", center: "center", justify: "block" } as const)[
      align as "start"
    ];
  }
  const ml = lengthToCm(attr(el, NS.fo, "margin-left"));
  if (ml !== undefined) p.leftMargin = +ml.toFixed(3);
  const mr = lengthToCm(attr(el, NS.fo, "margin-right"));
  if (mr !== undefined) p.rightMargin = +mr.toFixed(3);
  const mt = cmToPt(lengthToCm(attr(el, NS.fo, "margin-top")));
  if (mt !== undefined) p.spaceBefore = mt;
  const mb = cmToPt(lengthToCm(attr(el, NS.fo, "margin-bottom")));
  if (mb !== undefined) p.spaceAfter = mb;
  const lh = attr(el, NS.fo, "line-height")?.match(/^([\d.]+)%$/);
  if (lh) p.lineHeight = parseFloat(lh[1]);
  if (attr(el, NS.fo, "break-before") === "page") p.pageBreakBefore = true;
  return p;
}

function parseTextProps(el: Element | undefined, fonts: Map<string, string>): SvxCharAttrs {
  if (!el) return {};
  const c: SvxCharAttrs = {};
  const fontName = attr(el, NS.style, "font-name");
  const family = attr(el, NS.fo, "font-family");
  if (fontName) c.fontName = fonts.get(fontName) ?? fontName;
  else if (family) c.fontName = family.replace(/^['"]|['"]$/g, "");
  const size = attr(el, NS.fo, "font-size")?.match(/^([\d.]+)pt$/);
  if (size) c.fontSize = parseFloat(size[1]);
  const weight = attr(el, NS.fo, "font-weight");
  if (weight) c.bold = weight === "bold" || parseInt(weight, 10) >= 600;
  const style = attr(el, NS.fo, "font-style");
  if (style) c.italic = style === "italic" || style === "oblique";
  const ul = attr(el, NS.style, "text-underline-style");
  if (ul) c.underline = ul !== "none";
  const lt = attr(el, NS.style, "text-line-through-style");
  if (lt) c.strikeout = lt !== "none";
  const position = attr(el, NS.style, "text-position");
  if (position) {
    const first = position.split(/\s+/)[0];
    c.escapement =
      first === "super" || parseFloat(first) > 0 ? "super" : first === "sub" || parseFloat(first) < 0 ? "sub" : "none";
  }
  const color = attr(el, NS.fo, "color");
  if (color?.startsWith("#")) c.color = color;
  const bg = attr(el, NS.fo, "background-color");
  if (bg?.startsWith("#")) c.highlight = bg;
  return c;
}

function readStyles(docs: Document[]): ImportContext {
  const ctx: ImportContext = {
    paraStyles: new Map(),
    textStyles: new Map(),
    listStyles: new Map(),
    fonts: new Map(),
    pageDesc: DEFAULT_PAGE_DESC,
  };
  for (const doc of docs) {
    for (const el of Array.from(doc.getElementsByTagNameNS(NS.style, "font-face"))) {
      const name = attr(el, NS.style, "name");
      const family = attr(el, NS.svg, "font-family");
      if (name) ctx.fonts.set(name, (family ?? name).replace(/^['"]|['"]$/g, ""));
    }
  }
  for (const doc of docs) {
    for (const el of Array.from(doc.getElementsByTagNameNS(NS.style, "style"))) {
      const name = attr(el, NS.style, "name");
      if (!name) continue;
      const kids = children(el);
      const style: OdfStyle = {
        parent: attr(el, NS.style, "parent-style-name"),
        para: parseParaProps(kids.find((k) => is(k, NS.style, "paragraph-properties"))),
        char: parseTextProps(kids.find((k) => is(k, NS.style, "text-properties")), ctx.fonts),
      };
      const family = attr(el, NS.style, "family");
      if (family === "paragraph") ctx.paraStyles.set(name, style);
      else if (family === "text") ctx.textStyles.set(name, style);
    }
    for (const el of Array.from(doc.getElementsByTagNameNS(NS.text, "list-style"))) {
      const name = attr(el, NS.style, "name");
      if (!name) continue;
      const levels: SwListKind[] = [];
      for (const lvl of children(el)) {
        const n = parseInt(attr(lvl, NS.text, "level") ?? "1", 10);
        levels[n - 1] = lvl.localName === "list-level-style-bullet" ? "bullet" : "number";
      }
      ctx.listStyles.set(name, levels);
    }
    const layout = doc.getElementsByTagNameNS(NS.style, "page-layout-properties")[0];
    if (layout) {
      const cm = (n: string, dflt: number) => lengthToCm(attr(layout, NS.fo, n)) ?? dflt;
      const d = DEFAULT_PAGE_DESC;
      ctx.pageDesc = {
        name: d.name,
        width: cm("page-width", d.width),
        height: cm("page-height", d.height),
        marginTop: cm("margin-top", d.marginTop),
        marginBottom: cm("margin-bottom", d.marginBottom),
        marginLeft: cm("margin-left", d.marginLeft),
        marginRight: cm("margin-right", d.marginRight),
      };
    }
  }
  return ctx;
}

/**
 * Walks a paragraph style's parent chain up to a style Writer knows,
 * collecting the formatting of the styles in between as direct attributes.
 */
function resolveParaStyle(ctx: ImportContext, name: string | undefined) {
  const chain: OdfStyle[] = [];
  let cur = name;
  for (let guard = 0; cur && guard < 32; guard++) {
    if (hasParaStyle(cur)) break;
    const s = ctx.paraStyles.get(cur);
    if (!s) {
      cur = undefined;
      break;
    }
    chain.unshift(s);
    cur = s.parent;
  }
  const para: SvxParaAttrs = {};
  const char: SvxCharAttrs = {};
  for (const s of chain) {
    Object.assign(para, s.para);
    Object.assign(char, s.char);
  }
  return { style: cur ?? DEFAULT_STYLE, para, char };
}

function resolveTextStyle(ctx: ImportContext, name: string | undefined): SvxCharAttrs {
  const chain: OdfStyle[] = [];
  for (let cur = name, guard = 0; cur && guard < 32; guard++) {
    const s = ctx.textStyles.get(cur);
    if (!s) break;
    chain.unshift(s);
    cur = s.parent;
  }
  return Object.assign({}, ...chain.map((s) => s.char));
}

interface ListState {
  kind: SwListKind;
  level: number;
}

function importParagraph(ctx: ImportContext, el: Element, list: ListState | null): SwTextNode {
  const { style, para, char } = resolveParaStyle(ctx, attr(el, NS.text, "style-name"));
  const runs: SwTextRun[] = [];
  let lastSpace = true;
  const push = (text: string, attrs: SvxCharAttrs) => {
    if (text) runs.push({ text, attrs });
  };
  const walk = (parent: Element, attrs: SvxCharAttrs) => {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === 3 /* TEXT_NODE */) {
        let t = (child.nodeValue ?? "").replace(/[ \t\r\n]+/g, " ");
        if (lastSpace) t = t.replace(/^ /, "");
        if (t) lastSpace = t.endsWith(" ");
        push(t, attrs);
        continue;
      }
      if (child.nodeType !== 1 /* ELEMENT_NODE */) continue;
      const c = child as Element;
      if (is(c, NS.text, "s")) {
        push(" ".repeat(parseInt(attr(c, NS.text, "c") ?? "1", 10) || 1), attrs);
        lastSpace = true;
      } else if (is(c, NS.text, "tab")) {
        push("\t", attrs);
        lastSpace = true;
      } else if (is(c, NS.text, "line-break")) {
        push("\n", attrs);
        lastSpace = true;
      } else if (is(c, NS.text, "span")) {
        walk(c, { ...attrs, ...resolveTextStyle(ctx, attr(c, NS.text, "style-name")) });
      } else if (
        is(c, NS.text, "note") ||
        is(c, NS.office, "annotation") ||
        c.namespaceURI === "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
      ) {
        // Footnotes, comments and frames are not supported yet.
      } else {
        walk(c, attrs); // text:a, fields, bookmarks, …
      }
    }
  };
  walk(el, char);
  const attrs: SvxParaAttrs = { ...para };
  if (list) {
    attrs.list = list.kind;
    attrs.listLevel = list.level;
  }
  return { id: newNodeId(), style, attrs, runs: normalizeRuns(runs.length ? runs : [{ text: "", attrs: char }]) };
}

function importBody(ctx: ImportContext, parent: Element, out: SwTextNode[], list: ListState | null, listStyle?: string): void {
  for (const el of children(parent)) {
    if (is(el, NS.text, "p") || is(el, NS.text, "h")) {
      out.push(importParagraph(ctx, el, list));
    } else if (is(el, NS.text, "list")) {
      const styleName = attr(el, NS.text, "style-name") || listStyle;
      const level = (list?.level ?? 0) + 1;
      const kind = (styleName && ctx.listStyles.get(styleName)?.[level - 1]) || list?.kind || "bullet";
      for (const item of children(el)) importBody(ctx, item, out, { kind, level }, styleName);
    } else if (
      is(el, NS.text, "sequence-decls") ||
      is(el, NS.text, "tracked-changes") ||
      is(el, NS.office, "forms") ||
      is(el, NS.table, "table-columns")
    ) {
      // Metadata without body text.
    } else {
      importBody(ctx, el, out, list, listStyle); // sections, tables, indexes, …
    }
  }
}

function importDocuments(content: Document, styleDocs: Document[]): SwDoc {
  const err = content.getElementsByTagName("parsererror")[0];
  if (err) throw new Error(`Malformed ODF XML: ${err.textContent ?? ""}`);
  const ctx = readStyles([...styleDocs, content]);
  const text = content.getElementsByTagNameNS(NS.office, "text")[0];
  if (!text) throw new Error("Not an ODF text document (no office:text body).");
  const nodes: SwTextNode[] = [];
  importBody(ctx, text, nodes, null);
  if (nodes.length === 0) nodes.push({ id: newNodeId(), style: DEFAULT_STYLE, attrs: {}, runs: [{ text: "", attrs: {} }] });
  return { nodes, pageDesc: ctx.pageDesc };
}

const parse = (xml: string) => new DOMParser().parseFromString(xml, "application/xml");

export function importFlatOdt(xml: string): SwDoc {
  const doc = parse(xml);
  return importDocuments(doc, []);
}

export function importOdt(bytes: Uint8Array): SwDoc {
  const files = unzipSync(bytes, { filter: (f) => f.name === "content.xml" || f.name === "styles.xml" });
  if (!files["content.xml"]) throw new Error("Not an ODF package (content.xml missing).");
  const styles = files["styles.xml"] ? [parse(strFromU8(files["styles.xml"]))] : [];
  return importDocuments(parse(strFromU8(files["content.xml"])), styles);
}
