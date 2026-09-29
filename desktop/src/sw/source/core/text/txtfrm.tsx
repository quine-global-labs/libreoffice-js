/**
 * SwTextFrame — renders one paragraph (sw/source/core/text/txtfrm.cxx and the
 * portion painting in sw/source/core/text/). Upstream the frame formats
 * lines and paints glyphs itself; here the browser does line breaking and
 * this component translates Writer's attributes into CSS.
 *
 * DOM contract relied on by SwEditWin for selection mapping:
 *   .sw-para[data-sw-node=<index>] > .sw-txt > (span text runs)* [br filler]
 */
import { memo, type CSSProperties } from "react";
import type { SvxCharAttrs } from "../../../../editeng/source/items/textitem";
import { LIST_INDENT_CM } from "../../../../editeng/source/items/paraitem";
import { cssFontFamily } from "../../../../unotools/source/misc/fontdefs";
import { getNodeText, type SwTextNode } from "../../../inc/ndtxt";
import {
  effectiveCharAttrs,
  effectiveParaAttrs,
} from "../doc/DocumentStylePoolManager";

/** Relative size of super/subscript text (DFLT_ESC_PROP). */
const ESCAPEMENT_PROP = 0.58;
/** "Single" line spacing of the Liberation fonts relative to the font size. */
const SINGLE_LINE = 1.15;

export function charAttrsToCss(a: SvxCharAttrs): CSSProperties {
  const size = a.fontSize ?? 12;
  const esc = a.escapement && a.escapement !== "none" ? a.escapement : undefined;
  const deco = [a.underline && "underline", a.strikeout && "line-through"].filter(Boolean);
  return {
    fontFamily: cssFontFamily(a.fontName),
    fontSize: `${esc ? size * ESCAPEMENT_PROP : size}pt`,
    fontWeight: a.bold ? 700 : 400,
    fontStyle: a.italic ? "italic" : "normal",
    textDecorationLine: deco.length ? deco.join(" ") : "none",
    verticalAlign: esc ?? "baseline",
    color: a.color,
    backgroundColor: a.highlight,
  };
}

interface SwTextFrameProps {
  node: SwTextNode;
  index: number;
  label?: string;
}

export const SwTextFrame = memo(function SwTextFrame({ node, index, label }: SwTextFrameProps) {
  const para = effectiveParaAttrs(node);
  const base = effectiveCharAttrs(node.style, {});
  const text = getNodeText(node);
  const listIndent = node.attrs.list ? (node.attrs.listLevel ?? 1) * LIST_INDENT_CM : 0;

  const outer: CSSProperties = {
    paddingTop: `${para.spaceBefore ?? 0}pt`,
    paddingBottom: `${para.spaceAfter ?? 0}pt`,
    marginLeft: `${(para.leftMargin ?? 0) + listIndent}cm`,
    marginRight: `${para.rightMargin ?? 0}cm`,
  };
  const inner: CSSProperties = {
    ...charAttrsToCss(base),
    textDecorationLine: "none",
    backgroundColor: undefined,
    textAlign: para.adjust === "block" ? "justify" : (para.adjust ?? "left"),
    lineHeight: ((para.lineHeight ?? 100) / 100) * SINGLE_LINE,
  };

  return (
    <div className="sw-para" data-sw-node={index} style={outer}>
      <div
        className="sw-txt"
        data-label={label}
        data-empty={text.length === 0 ? "" : undefined}
        style={inner}
      >
        {node.runs.map((run, i) =>
          run.text ? (
            <span key={i} style={charAttrsToCss(effectiveCharAttrs(node.style, run.attrs))}>
              {run.text}
            </span>
          ) : null,
        )}
        {(text.length === 0 || text.endsWith("\n")) && <br data-sw-filler="" />}
      </div>
    </div>
  );
});
