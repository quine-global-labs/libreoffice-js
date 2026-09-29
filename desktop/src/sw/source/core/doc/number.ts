/**
 * List numbering — counterpart of sw/source/core/doc/number.cxx (SwNumRule).
 * Computes the label shown in front of each list paragraph. Consecutive list
 * paragraphs of the same kind form one list; a deeper level restarts when a
 * shallower item appears.
 */
import type { SwDoc } from "../../../inc/doc";

const BULLETS = ["•", "◦", "▪"];

export function computeListLabels(doc: SwDoc): (string | undefined)[] {
  const labels: (string | undefined)[] = [];
  let counters: number[] = [];
  let kind: string | undefined;
  for (const node of doc.nodes) {
    const list = node.attrs.list;
    if (!list) {
      labels.push(undefined);
      counters = [];
      kind = undefined;
      continue;
    }
    if (list !== kind) counters = [];
    kind = list;
    const level = Math.max(1, node.attrs.listLevel ?? 1);
    counters.length = level;
    counters[level - 1] = (counters[level - 1] ?? 0) + 1;
    labels.push(list === "bullet" ? BULLETS[(level - 1) % BULLETS.length] : `${counters[level - 1]}.`);
  }
  return labels;
}
