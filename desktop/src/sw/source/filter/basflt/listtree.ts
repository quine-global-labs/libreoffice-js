/**
 * Groups the flat paragraph array into nested lists, as the export filters
 * need (ODF text:list / HTML ul+ol). Upstream the equivalent bookkeeping
 * lives in each filter's list handling (e.g. XMLTextParagraphExport).
 */
import type { SwListKind } from "../../../../editeng/source/items/paraitem";
import type { SwTextNode } from "../../../inc/ndtxt";

export type SwBlock =
  | { kind: "para"; node: SwTextNode }
  | { kind: "list"; list: SwListKind; items: SwBlock[][] };

const levelOf = (n: SwTextNode) => Math.max(1, n.attrs.listLevel ?? 1);

function buildList(
  nodes: readonly SwTextNode[],
  start: number,
  level: number,
  list: SwListKind,
): [SwBlock, number] {
  const items: SwBlock[][] = [];
  let i = start;
  const inList = (j: number) => j < nodes.length && nodes[j].attrs.list === list && levelOf(nodes[j]) >= level;
  while (inList(i)) {
    const item: SwBlock[] = [];
    if (levelOf(nodes[i]) === level) item.push({ kind: "para", node: nodes[i++] });
    while (inList(i) && levelOf(nodes[i]) > level) {
      const [sub, next] = buildList(nodes, i, level + 1, list);
      item.push(sub);
      i = next;
    }
    items.push(item);
  }
  return [{ kind: "list", list, items }, i];
}

export function buildBlocks(nodes: readonly SwTextNode[]): SwBlock[] {
  const out: SwBlock[] = [];
  let i = 0;
  while (i < nodes.length) {
    const list = nodes[i].attrs.list;
    if (list) {
      const [block, next] = buildList(nodes, i, 1, list);
      out.push(block);
      i = next;
    } else {
      out.push({ kind: "para", node: nodes[i++] });
    }
  }
  return out;
}
