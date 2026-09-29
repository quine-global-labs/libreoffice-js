/** Plain-text import — counterpart of sw/source/filter/ascii/parasc.cxx. */
import type { SwDoc } from "../../../inc/doc";
import { makeTextNode } from "../../../inc/ndtxt";
import { DEFAULT_STYLE } from "../../core/doc/DocumentStylePoolManager";
import { createDoc } from "../../core/doc/docnew";

export function importText(text: string): SwDoc {
  const lines = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
  return createDoc(lines.map((line) => makeTextNode(line, DEFAULT_STYLE)));
}
