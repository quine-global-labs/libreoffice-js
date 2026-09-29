/** Plain-text export — counterpart of sw/source/filter/ascii/wrtasc.cxx. */
import type { SwDoc } from "../../../inc/doc";
import { getNodeText } from "../../../inc/ndtxt";

export function exportText(doc: SwDoc): string {
  return doc.nodes.map(getNodeText).join("\n") + "\n";
}
