/**
 * Navigator — counterpart of sw/source/uibase/utlui/navipi.cxx and the
 * content tree (content.cxx). Lists the document's headings; clicking one
 * moves the cursor there. Tables, images, bookmarks etc. come later.
 */
import { getNodeText } from "../../../inc/ndtxt";
import type { SwDoc } from "../../../inc/doc";
import { getParaStyle } from "../../core/doc/DocumentStylePoolManager";

export interface SwNavigatorHeading {
  node: number;
  level: number;
  text: string;
}

export function collectHeadings(doc: SwDoc): SwNavigatorHeading[] {
  const out: SwNavigatorHeading[] = [];
  doc.nodes.forEach((n, node) => {
    const level = getParaStyle(n.style).outlineLevel;
    if (level) out.push({ node, level, text: getNodeText(n).replace(/\s+/g, " ").trim() });
  });
  return out;
}

export function SwNavigator({
  doc,
  currentNode,
  onGoto,
}: {
  doc: SwDoc;
  currentNode: number;
  onGoto: (node: number) => void;
}) {
  const headings = collectHeadings(doc);
  const current = [...headings].reverse().find((h) => h.node <= currentNode)?.node;
  return (
    <div className="sw-navigator">
      <div className="sfx-stylelist-family">Headings</div>
      {headings.length === 0 ? (
        <p className="sw-navigator-empty">No headings. Apply a Heading style (Ctrl+1, Ctrl+2, …) to build an outline.</p>
      ) : (
        <ul role="tree" aria-label="Headings">
          {headings.map((h) => (
            <li
              key={h.node}
              role="treeitem"
              aria-selected={h.node === current}
              style={{ paddingLeft: 8 + (h.level - 1) * 14 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onGoto(h.node)}
            >
              {h.text || <em>(empty heading)</em>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
