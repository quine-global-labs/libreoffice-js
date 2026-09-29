/**
 * SwDoc — the document. Upstream (sw/inc/doc.hxx) it owns the node array
 * (SwNodes), format pools, page descriptors and the undo manager; here it is
 * an immutable value so that undo is a snapshot and React can diff it.
 */
import type { SwTextNode } from "./ndtxt";

/** Page style (SwPageDesc). All lengths in cm. */
export interface SwPageDesc {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly marginTop: number;
  readonly marginBottom: number;
  readonly marginLeft: number;
  readonly marginRight: number;
}

export interface SwDoc {
  /** Body text nodes. Always contains at least one paragraph. */
  readonly nodes: readonly SwTextNode[];
  readonly pageDesc: SwPageDesc;
}

export const DEFAULT_PAGE_DESC: SwPageDesc = {
  name: "Default Page Style",
  width: 21.0,
  height: 29.7,
  marginTop: 2.0,
  marginBottom: 2.0,
  marginLeft: 2.0,
  marginRight: 2.0,
};

/** 1cm in CSS px (96dpi). */
export const CM_TO_PX = 96 / 2.54;
