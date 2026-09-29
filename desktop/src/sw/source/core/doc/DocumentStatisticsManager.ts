/**
 * Document statistics (SwDocStat) — counterpart of
 * sw/source/core/doc/DocumentStatisticsManager.cxx, used by the status bar
 * word count and Tools > Word Count.
 */
import type { SwDoc } from "../../../inc/doc";
import { getNodeText } from "../../../inc/ndtxt";

export interface SwDocStat {
  words: number;
  chars: number;
  charsExclSpaces: number;
  paragraphs: number;
}

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : null;

export function countText(text: string): SwDocStat {
  let words = 0;
  if (segmenter) {
    for (const seg of segmenter.segment(text)) if (seg.isWordLike) words++;
  } else {
    words = text.split(/\s+/).filter(Boolean).length;
  }
  const chars = [...text].length;
  const charsExclSpaces = [...text.replace(/\s/g, "")].length;
  return { words, chars, charsExclSpaces, paragraphs: text.trim() ? 1 : 0 };
}

export function countTexts(texts: readonly string[]): SwDocStat {
  const stat: SwDocStat = { words: 0, chars: 0, charsExclSpaces: 0, paragraphs: 0 };
  for (const t of texts) {
    const s = countText(t);
    stat.words += s.words;
    stat.chars += s.chars;
    stat.charsExclSpaces += s.charsExclSpaces;
    stat.paragraphs += s.paragraphs;
  }
  return stat;
}

export function countDoc(doc: SwDoc): SwDocStat {
  return countTexts(doc.nodes.map(getNodeText));
}
