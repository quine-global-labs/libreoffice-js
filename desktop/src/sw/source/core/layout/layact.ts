/**
 * Pagination — a much-simplified SwLayAction (sw/source/core/layout/layact.cxx).
 * Upstream the layout splits text frames across pages line by line; this
 * skeleton moves whole paragraphs, using the heights measured from the DOM
 * by SwEditWin.
 */
import { CM_TO_PX, type SwDoc, type SwPageDesc } from "../../../inc/doc";

/** Height of the page's text area (SwPageFrame body) in CSS px. */
export function bodyHeightPx(desc: SwPageDesc): number {
  return (desc.height - desc.marginTop - desc.marginBottom) * CM_TO_PX;
}

/** Returns the index of the first paragraph on each page. */
export function calcPageStarts(doc: SwDoc, heights: readonly number[]): number[] {
  const limit = bodyHeightPx(doc.pageDesc);
  const starts = [0];
  let y = 0;
  doc.nodes.forEach((node, i) => {
    const h = heights[i] ?? 0;
    if (i > 0 && (node.attrs.pageBreakBefore || (y > 0 && y + h > limit))) {
      starts.push(i);
      y = 0;
    }
    y += h;
  });
  return starts;
}

/** Page (0-based) containing paragraph `node`. */
export function pageOfNode(pageStarts: readonly number[], node: number): number {
  let page = 0;
  while (page + 1 < pageStarts.length && pageStarts[page + 1] <= node) page++;
  return page;
}

export function sameStarts(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
