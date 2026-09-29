/**
 * Paragraph attributes — counterpart of editeng's paragraph items
 * (SvxAdjustItem, SvxLRSpaceItem, SvxULSpaceItem, SvxLineSpacingItem,
 * SvxFormatBreakItem) plus Writer's numbering rule reference (SwNumRuleItem),
 * collapsed into one set.
 */
export type SvxAdjust = "left" | "center" | "right" | "block";

export type SwListKind = "bullet" | "number";

export interface SvxParaAttrs {
  adjust?: SvxAdjust;
  /** Left indent in cm (excluding list indentation). */
  leftMargin?: number;
  /** Right indent in cm. */
  rightMargin?: number;
  /** Spacing above the paragraph in pt. */
  spaceBefore?: number;
  /** Spacing below the paragraph in pt. */
  spaceAfter?: number;
  /** Proportional line spacing in percent (100 = single). */
  lineHeight?: number;
  /** fo:break-before="page". */
  pageBreakBefore?: boolean;
  /** Paragraph is a list item of this kind. */
  list?: SwListKind;
  /** 1-based list level. */
  listLevel?: number;
}

export const MAX_LIST_LEVEL = 10;

/** "Increase Indent" step for plain paragraphs, in cm (default tab stop). */
export const INDENT_STEP_CM = 1.25;
/** Indentation per list level, in cm. */
export const LIST_INDENT_CM = 0.635;
