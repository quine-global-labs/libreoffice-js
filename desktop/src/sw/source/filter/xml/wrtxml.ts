/**
 * ODF export — counterpart of sw/source/filter/xml/wrtxml.cxx (SwXMLWriter)
 * driving xmloff's text export. Produces either a zipped .odt package or a
 * single-file flat .fodt document.
 */
import { strToU8, zipSync, type Zippable } from "fflate";
import type { SvxCharAttrs } from "../../../../editeng/source/items/textitem";
import {
  LIST_INDENT_CM,
  MAX_LIST_LEVEL,
  type SvxParaAttrs,
  type SwListKind,
} from "../../../../editeng/source/items/paraitem";
import type { SwDoc } from "../../../inc/doc";
import { getNodeText, type SwTextNode } from "../../../inc/ndtxt";
import {
  getParaStyle,
  PARA_STYLE_POOL,
} from "../../core/doc/DocumentStylePoolManager";
import { buildBlocks, type SwBlock } from "../basflt/listtree";
import { NS_DECLS, ODT_MIMETYPE } from "./xmlnmspe";

const GENERATOR = "LibreOfficeJS/0.1";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const num = (v: number) => String(+v.toFixed(4));
const attrs = (a: Record<string, string | undefined>) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${esc(v!)}"`)
    .join("");

const ALIGN: Record<string, string> = { left: "start", center: "center", right: "end", block: "justify" };

function paraProps(p: SvxParaAttrs, includeList: boolean): string {
  const a = attrs({
    "fo:text-align": p.adjust && ALIGN[p.adjust],
    "fo:margin-left":
      p.leftMargin !== undefined && !(includeList && p.list) ? `${num(p.leftMargin)}cm` : undefined,
    "fo:margin-right": p.rightMargin !== undefined ? `${num(p.rightMargin)}cm` : undefined,
    "fo:margin-top": p.spaceBefore !== undefined ? `${num(p.spaceBefore)}pt` : undefined,
    "fo:margin-bottom": p.spaceAfter !== undefined ? `${num(p.spaceAfter)}pt` : undefined,
    "fo:line-height": p.lineHeight !== undefined ? `${num(p.lineHeight)}%` : undefined,
    "fo:break-before": p.pageBreakBefore ? "page" : undefined,
  });
  return a ? `<style:paragraph-properties${a}/>` : "";
}

function textProps(c: SvxCharAttrs): string {
  const bool = (v: boolean | undefined, on: string, off: string) =>
    v === undefined ? undefined : v ? on : off;
  const a = attrs({
    "style:font-name": c.fontName,
    "fo:font-size": c.fontSize !== undefined ? `${num(c.fontSize)}pt` : undefined,
    "fo:font-weight": bool(c.bold, "bold", "normal"),
    "fo:font-style": bool(c.italic, "italic", "normal"),
    "style:text-underline-style": bool(c.underline, "solid", "none"),
    "style:text-underline-width": c.underline ? "auto" : undefined,
    "style:text-underline-color": c.underline ? "font-color" : undefined,
    "style:text-line-through-style": bool(c.strikeout, "solid", "none"),
    "style:text-position":
      c.escapement === "super" ? "super 58%" : c.escapement === "sub" ? "sub 58%" : c.escapement === "none" ? "0% 100%" : undefined,
    "fo:color": c.color,
    "fo:background-color": c.highlight,
  });
  return a ? `<style:text-properties${a}/>` : "";
}

/** Assigns automatic style names (P1, T1, …) to distinct attribute sets. */
class AutoStylePool {
  private readonly byKey = new Map<string, string>();
  readonly xml: string[] = [];
  constructor(private readonly prefix: string) {}
  get(key: string, build: (name: string) => string): string {
    let name = this.byKey.get(key);
    if (!name) {
      name = `${this.prefix}${this.byKey.size + 1}`;
      this.byKey.set(key, name);
      this.xml.push(build(name));
    }
    return name;
  }
}

function listStyleXml(name: string, kind: SwListKind): string {
  let levels = "";
  for (let l = 1; l <= MAX_LIST_LEVEL; l++) {
    const indent = `${num(l * LIST_INDENT_CM)}cm`;
    const props =
      `<style:list-level-properties text:list-level-position-and-space-mode="label-alignment">` +
      `<style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="${indent}" fo:text-indent="-${num(LIST_INDENT_CM)}cm" fo:margin-left="${indent}"/>` +
      `</style:list-level-properties>`;
    levels +=
      kind === "bullet"
        ? `<text:list-level-style-bullet text:level="${l}" text:bullet-char="${["•", "◦", "▪"][(l - 1) % 3]}">${props}</text:list-level-style-bullet>`
        : `<text:list-level-style-number text:level="${l}" style:num-suffix="." style:num-format="1">${props}</text:list-level-style-number>`;
  }
  return `<text:list-style style:name="${name}">${levels}</text:list-style>`;
}

/** Writes paragraph text with ODF whitespace handling (text:s, text:tab, …). */
class TextWriter {
  private prevSpace = true; // leading spaces must be written as text:s
  out = "";
  write(text: string): void {
    let spaces = 0;
    const flushSpaces = () => {
      if (spaces > 0) {
        this.out += spaces === 1 ? "<text:s/>" : `<text:s text:c="${spaces}"/>`;
        spaces = 0;
      }
    };
    for (const ch of text) {
      if (ch === " ") {
        if (this.prevSpace) spaces++;
        else this.out += " ";
        this.prevSpace = true;
        continue;
      }
      flushSpaces();
      if (ch === "\t") this.out += "<text:tab/>";
      else if (ch === "\n") this.out += "<text:line-break/>";
      else this.out += esc(ch);
      this.prevSpace = ch === "\t" || ch === "\n";
    }
    flushSpaces();
  }
}

interface OdfParts {
  fontDecls: string;
  styles: string;
  stylesAutomatic: string;
  masterStyles: string;
  contentAutomatic: string;
  body: string;
}

function collectFonts(doc: SwDoc): Set<string> {
  const fonts = new Set<string>();
  for (const s of PARA_STYLE_POOL) if (s.char.fontName) fonts.add(s.char.fontName);
  for (const n of doc.nodes) for (const r of n.runs) if (r.attrs.fontName) fonts.add(r.attrs.fontName);
  return fonts;
}

function exportParts(doc: SwDoc): OdfParts {
  const fontDecls = [...collectFonts(doc)]
    .map((f) => `<style:font-face style:name="${esc(f)}" svg:font-family="${esc(`'${f}'`)}"/>`)
    .join("");

  const styles =
    `<style:default-style style:family="paragraph"><style:text-properties fo:language="en" fo:country="US"/></style:default-style>` +
    PARA_STYLE_POOL.map((s) => {
      const a = attrs({
        "style:name": s.name,
        "style:display-name": s.uiName !== s.name ? s.uiName : undefined,
        "style:family": "paragraph",
        "style:parent-style-name": s.parent,
        "style:next-style-name": s.next,
        "style:default-outline-level": s.outlineLevel ? String(s.outlineLevel) : undefined,
      });
      return `<style:style${a}>${paraProps(s.para, false)}${textProps(s.char)}</style:style>`;
    }).join("");

  const pd = doc.pageDesc;
  const stylesAutomatic =
    `<style:page-layout style:name="pm1"><style:page-layout-properties` +
    attrs({
      "fo:page-width": `${num(pd.width)}cm`,
      "fo:page-height": `${num(pd.height)}cm`,
      "style:print-orientation": pd.width > pd.height ? "landscape" : "portrait",
      "fo:margin-top": `${num(pd.marginTop)}cm`,
      "fo:margin-bottom": `${num(pd.marginBottom)}cm`,
      "fo:margin-left": `${num(pd.marginLeft)}cm`,
      "fo:margin-right": `${num(pd.marginRight)}cm`,
    }) +
    `/></style:page-layout>`;
  const masterStyles = `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`;

  const pStyles = new AutoStylePool("P");
  const tStyles = new AutoStylePool("T");
  const listStyles: Partial<Record<SwListKind, string>> = {};
  const listStyleXmls: string[] = [];
  const listStyleName = (kind: SwListKind) =>
    (listStyles[kind] ??= (() => {
      const name = `L${listStyleXmls.length + 1}`;
      listStyleXmls.push(listStyleXml(name, kind));
      return name;
    })());

  const paraXml = (node: SwTextNode): string => {
    const { list: _l, listLevel: _ll, ...direct } = node.attrs;
    const empty = getNodeText(node) === "";
    const emptyAttrs = empty ? node.runs[0]?.attrs ?? {} : {};
    const pProps = paraProps(direct, true) + textProps(emptyAttrs);
    const styleName = pProps
      ? pStyles.get(`${node.style}|${pProps}`, (name) =>
          `<style:style style:name="${name}" style:family="paragraph" style:parent-style-name="${esc(node.style)}">${pProps}</style:style>`,
        )
      : node.style;
    const tw = new TextWriter();
    let inner = "";
    for (const run of node.runs) {
      if (!run.text) continue;
      const tProps = textProps(run.attrs);
      tw.out = "";
      tw.write(run.text);
      if (tProps) {
        const t = tStyles.get(tProps, (name) =>
          `<style:style style:name="${name}" style:family="text">${tProps}</style:style>`,
        );
        inner += `<text:span text:style-name="${t}">${tw.out}</text:span>`;
      } else {
        inner += tw.out;
      }
    }
    const level = getParaStyle(node.style).outlineLevel;
    return level
      ? `<text:h text:style-name="${esc(styleName)}" text:outline-level="${level}">${inner}</text:h>`
      : `<text:p text:style-name="${esc(styleName)}">${inner}</text:p>`;
  };

  const blockXml = (block: SwBlock, top: boolean): string => {
    if (block.kind === "para") return paraXml(block.node);
    const styleAttr = top ? ` text:style-name="${listStyleName(block.list)}"` : "";
    return (
      `<text:list${styleAttr}>` +
      block.items
        .map((item) => `<text:list-item>${item.map((b) => blockXml(b, false)).join("")}</text:list-item>`)
        .join("") +
      `</text:list>`
    );
  };

  const body = buildBlocks(doc.nodes).map((b) => blockXml(b, true)).join("");
  return {
    fontDecls,
    styles,
    stylesAutomatic,
    masterStyles,
    contentAutomatic: pStyles.xml.join("") + tStyles.xml.join("") + listStyleXmls.join(""),
    body,
  };
}

const XML_DECL = `<?xml version="1.0" encoding="UTF-8"?>\n`;

/** Flat XML ODF Text Document (.fodt). */
export function exportFlatOdt(doc: SwDoc): string {
  const p = exportParts(doc);
  return (
    XML_DECL +
    `<office:document ${NS_DECLS} office:version="1.3" office:mimetype="${ODT_MIMETYPE}">` +
    `<office:meta><meta:generator>${GENERATOR}</meta:generator></office:meta>` +
    `<office:font-face-decls>${p.fontDecls}</office:font-face-decls>` +
    `<office:styles>${p.styles}</office:styles>` +
    `<office:automatic-styles>${p.stylesAutomatic}${p.contentAutomatic}</office:automatic-styles>` +
    `<office:master-styles>${p.masterStyles}</office:master-styles>` +
    `<office:body><office:text>${p.body}</office:text></office:body>` +
    `</office:document>`
  );
}

/** ODF Text Document package (.odt). */
export function exportOdt(doc: SwDoc): Uint8Array {
  const p = exportParts(doc);
  const content =
    XML_DECL +
    `<office:document-content ${NS_DECLS} office:version="1.3">` +
    `<office:font-face-decls>${p.fontDecls}</office:font-face-decls>` +
    `<office:automatic-styles>${p.contentAutomatic}</office:automatic-styles>` +
    `<office:body><office:text>${p.body}</office:text></office:body>` +
    `</office:document-content>`;
  const styles =
    XML_DECL +
    `<office:document-styles ${NS_DECLS} office:version="1.3">` +
    `<office:font-face-decls>${p.fontDecls}</office:font-face-decls>` +
    `<office:styles>${p.styles}</office:styles>` +
    `<office:automatic-styles>${p.stylesAutomatic}</office:automatic-styles>` +
    `<office:master-styles>${p.masterStyles}</office:master-styles>` +
    `</office:document-styles>`;
  const meta =
    XML_DECL +
    `<office:document-meta ${NS_DECLS} office:version="1.3"><office:meta><meta:generator>${GENERATOR}</meta:generator></office:meta></office:document-meta>`;
  const manifest =
    XML_DECL +
    `<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">` +
    `<manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${ODT_MIMETYPE}"/>` +
    ["content.xml", "styles.xml", "meta.xml"]
      .map((f) => `<manifest:file-entry manifest:full-path="${f}" manifest:media-type="text/xml"/>`)
      .join("") +
    `</manifest:manifest>`;

  // The mimetype entry must come first and be stored uncompressed.
  const files: Zippable = {
    mimetype: [strToU8(ODT_MIMETYPE), { level: 0 }],
    "content.xml": strToU8(content),
    "styles.xml": strToU8(styles),
    "meta.xml": strToU8(meta),
    "META-INF/manifest.xml": strToU8(manifest),
  };
  return zipSync(files, { level: 6 });
}
