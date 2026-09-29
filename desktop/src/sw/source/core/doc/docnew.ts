/**
 * Document creation — counterpart of sw/source/core/doc/docnew.cxx
 * (SwDoc::SwDoc sets up an empty body with one paragraph).
 */
import { DEFAULT_PAGE_DESC, type SwDoc } from "../../../inc/doc";
import { makeTextNode, type SwTextNode } from "../../../inc/ndtxt";
import { DEFAULT_STYLE } from "./DocumentStylePoolManager";

export function createDoc(nodes: readonly SwTextNode[] = []): SwDoc {
  return {
    nodes: nodes.length > 0 ? nodes : [makeTextNode("", DEFAULT_STYLE)],
    pageDesc: DEFAULT_PAGE_DESC,
  };
}
