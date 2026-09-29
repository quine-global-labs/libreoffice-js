/**
 * HTML export — counterpart of sw/source/filter/html/wrthtml.cxx
 * (SwHTMLWriter). Used for "Save As > HTML" and for the text/html flavour
 * on the clipboard.
 */
import type { SvxCharAttrs } from "../../../../editeng/source/items/textitem";
import { cssFontFamily } from "../../../../unotools/source/misc/fontdefs";
import type { SwDoc } from "../../../inc/doc";
import type { SwTextNode } from "../../../inc/ndtxt";
import {
  effectiveParaAttrs,
  getParaStyle,
} from "../../core/doc/DocumentStylePoolManager";
import { buildBlocks, type SwBlock } from "../basflt/listtree";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cssText(style: Record<string, unknown>): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${v}`)
    .join("; ");
}

/** CSS for the attributes set directly on a run (style formatting is implied by the tag/class). */
function directCharCss(a: SvxCharAttrs): Record<string, string | undefined> {
  const deco = [a.underline && "underline", a.strikeout && "line-through"].filter(Boolean).join(" ");
  const flag = (v: boolean | undefined, on: string, off: string) => (v === undefined ? undefined : v ? on : off);
  return {
    fontFamily: a.fontName ? cssFontFamily(a.fontName) : undefined,
    fontSize: a.fontSize ? `${a.fontSize}pt` : undefined,
    fontWeight: flag(a.bold, "bold", "normal"),
    fontStyle: flag(a.italic, "italic", "normal"),
    textDecorationLine: deco || undefined,
    verticalAlign: a.escapement && a.escapement !== "none" ? a.escapement : undefined,
    color: a.color,
    backgroundColor: a.highlight,
  };
}

const TAGS: Record<string, string> = {
  Heading_20_1: "h1",
  Heading_20_2: "h2",
  Heading_20_3: "h3",
  Title: "h1",
  Preformatted_20_Text: "pre",
};

function paraHtml(node: SwTextNode): string {
  const tag = TAGS[node.style] ?? "p";
  const para = effectiveParaAttrs(node);
  const style = cssText({
    textAlign: para.adjust === "block" ? "justify" : para.adjust !== "left" ? para.adjust : undefined,
    marginLeft: para.leftMargin && !node.attrs.list ? `${para.leftMargin}cm` : undefined,
  });
  const inner = node.runs
    .filter((r) => r.text)
    .map((r) => {
      const text = esc(r.text).replace(/\n/g, "<br>");
      const css = cssText(directCharCss(r.attrs));
      return css ? `<span style="${esc(css)}">${text}</span>` : text;
    })
    .join("");
  const cls = getParaStyle(node.style).uiName;
  return `<${tag} class="${esc(cls)}"${style ? ` style="${esc(style)}"` : ""}>${inner || "<br>"}</${tag}>`;
}

function blockHtml(block: SwBlock): string {
  if (block.kind === "para") return paraHtml(block.node);
  const tag = block.list === "number" ? "ol" : "ul";
  return `<${tag}>${block.items.map((item) => `<li>${item.map(blockHtml).join("")}</li>`).join("")}</${tag}>`;
}

/** The body markup only (clipboard). */
export function exportHtmlFragment(nodes: readonly SwTextNode[]): string {
  return buildBlocks(nodes).map(blockHtml).join("\n");
}

export function exportHtml(doc: SwDoc, title = "Document"): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="generator" content="LibreOfficeJS/0.1">
<title>${esc(title)}</title>
<style>
body { font-family: "Liberation Serif", "Times New Roman", serif; font-size: 12pt; max-width: ${doc.pageDesc.width - doc.pageDesc.marginLeft - doc.pageDesc.marginRight}cm; margin: 2cm auto; }
h1, h2, h3, .Title, .Subtitle { font-family: "Liberation Sans", Arial, sans-serif; }
.Title, .Subtitle { text-align: center; }
p { margin: 0; }
</style>
</head>
<body>
${exportHtmlFragment(doc.nodes)}
</body>
</html>
`;
}
