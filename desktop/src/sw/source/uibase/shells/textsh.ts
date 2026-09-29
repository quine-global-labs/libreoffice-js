/**
 * SwTextShell — slots available while the cursor is in text
 * (sw/source/uibase/shells/textsh.cxx, textsh1.cxx, txtattr.cxx,
 * basesh.cxx). Execute* and GetState* of upstream map to `exec` / `state`.
 */
import type { SvxAdjust } from "../../../../editeng/source/items/paraitem";
import type { SfxArgs, SfxShell, SfxSlot } from "../../../../sfx2/source/control/dispatch";
import { cssFontFamily } from "../../../../unotools/source/misc/fontdefs";
import { hasSelection } from "../../../inc/pam";
import {
  findParaStyleByUiName,
  getParaStyle,
  PARA_STYLE_POOL,
  resolveParaStyle,
} from "../../core/doc/DocumentStylePoolManager";
import type { SwWrtShell } from "../wrtsh/wrtsh";

export interface SwTextShellContext {
  copy(cut: boolean): Promise<void>;
  paste(unformatted: boolean): Promise<void>;
}

/** Entries for the paragraph style box / Styles deck, with a preview look. */
export const PARA_STYLE_ENTRIES = PARA_STYLE_POOL.filter((s) => s.name !== "Heading").map((s) => {
  const c = resolveParaStyle(s.name).char;
  return {
    uiName: s.uiName,
    preview: {
      fontFamily: cssFontFamily(c.fontName),
      fontSize: `${Math.min(c.fontSize ?? 12, 16)}pt`,
      fontWeight: c.bold ? 700 : 400,
    },
  };
});

const STYLE_COMMANDS: Record<string, string> = {
  ".uno:DefaultParaStyle": "Standard",
  ".uno:TitleParaStyle": "Title",
  ".uno:SubtitleParaStyle": "Subtitle",
  ".uno:Heading1ParaStyle": "Heading_20_1",
  ".uno:Heading2ParaStyle": "Heading_20_2",
  ".uno:Heading3ParaStyle": "Heading_20_3",
  ".uno:TextBodyParaStyle": "Text_20_body",
  ".uno:QuoteParaStyle": "Quotations",
  ".uno:PreformattedParaStyle": "Preformatted_20_Text",
};

const ADJUST_COMMANDS: Record<string, SvxAdjust> = {
  ".uno:LeftPara": "left",
  ".uno:CenterPara": "center",
  ".uno:RightPara": "right",
  ".uno:JustifyPara": "block",
};

const LINE_SPACING_COMMANDS: Record<string, number> = {
  ".uno:SpacePara1": 100,
  ".uno:SpacePara115": 115,
  ".uno:SpacePara15": 150,
  ".uno:SpacePara2": 200,
};

const TOGGLES = {
  ".uno:Bold": "bold",
  ".uno:Italic": "italic",
  ".uno:Underline": "underline",
  ".uno:Strikeout": "strikeout",
} as const;

const colorArg = (args?: SfxArgs) => (typeof args?.Color === "string" ? args.Color : undefined);

export function createTextShell(sh: SwWrtShell, ctx: SwTextShellContext): SfxShell {
  const slots: Record<string, SfxSlot> = {
    // Editing (basesh.cxx / textsh1.cxx)
    ".uno:Undo": { exec: () => sh.undo(), state: () => ({ enabled: !!sh.getSnapshot().undoComment }) },
    ".uno:Redo": { exec: () => sh.redo(), state: () => ({ enabled: !!sh.getSnapshot().redoComment }) },
    ".uno:Cut": { exec: () => ctx.copy(true), state: () => ({ enabled: hasSelection(sh.pam) }) },
    ".uno:Copy": { exec: () => ctx.copy(false), state: () => ({ enabled: hasSelection(sh.pam) }) },
    ".uno:Paste": { exec: () => ctx.paste(false) },
    ".uno:PasteUnformatted": { exec: () => ctx.paste(true) },
    ".uno:SelectAll": { exec: () => sh.selectAll() },
    ".uno:InsertPagebreak": { exec: () => sh.insertPageBreak() },
    ".uno:InsertDateField": { exec: () => sh.insert(new Date().toLocaleDateString()) },
    ".uno:InsertTimeField": { exec: () => sh.insert(new Date().toLocaleTimeString()) },

    // Character attributes (txtattr.cxx)
    ".uno:SuperScript": {
      exec: () => sh.toggleEscapement("super"),
      state: () => ({ checked: sh.getCharAttrs().escapement === "super" }),
    },
    ".uno:SubScript": {
      exec: () => sh.toggleEscapement("sub"),
      state: () => ({ checked: sh.getCharAttrs().escapement === "sub" }),
    },
    ".uno:ResetAttributes": { exec: () => sh.resetCharAttrs() },
    ".uno:FontColor": { exec: (a) => sh.setCharAttrs({ color: colorArg(a) }) },
    ".uno:CharBackColor": { exec: (a) => sh.setCharAttrs({ highlight: colorArg(a) }) },
    ".uno:CharFontName": {
      exec: (a) => typeof a?.CharFontName === "string" && sh.setCharAttrs({ fontName: a.CharFontName }),
      state: () => ({ value: sh.getCharAttrs().fontName }),
    },
    ".uno:FontHeight": {
      exec: (a) => typeof a?.FontHeight === "number" && sh.setCharAttrs({ fontSize: a.FontHeight }),
      state: () => ({ value: sh.getCharAttrs().fontSize }),
    },

    // Paragraph attributes and lists
    ".uno:DefaultBullet": {
      exec: () => sh.toggleList("bullet"),
      state: () => ({ checked: sh.getParaAttrs().list === "bullet" }),
    },
    ".uno:DefaultNumbering": {
      exec: () => sh.toggleList("number"),
      state: () => ({ checked: sh.getParaAttrs().list === "number" }),
    },
    ".uno:IncrementIndent": { exec: () => sh.changeIndent(1) },
    ".uno:DecrementIndent": { exec: () => sh.changeIndent(-1) },
    ".uno:ULSpacing": {
      exec: (a) =>
        sh.setParaAttrs({ spaceBefore: Number(a?.Upper ?? 0), spaceAfter: Number(a?.Lower ?? 0) }),
      state: () => {
        const p = sh.getParaAttrs();
        return { value: { upper: p.spaceBefore ?? 0, lower: p.spaceAfter ?? 0 } };
      },
    },
    ".uno:LeftRightParaMargin": {
      exec: (a) => sh.setParaAttrs({ leftMargin: Number(a?.Left ?? 0) }),
      state: () => ({ value: sh.getParaAttrs().leftMargin ?? 0 }),
    },

    // Paragraph styles (.uno:StyleApply and the Styles menu)
    ".uno:StyleApply": {
      exec: (a) => {
        const style = typeof a?.Style === "string" ? findParaStyleByUiName(a.Style) : undefined;
        if (style) sh.setParaStyle(style.name);
      },
      state: () => ({
        value: { current: getParaStyle(sh.getParaStyle()).uiName, styles: PARA_STYLE_ENTRIES },
      }),
    },
  };

  for (const [cmd, key] of Object.entries(TOGGLES)) {
    slots[cmd] = { exec: () => sh.toggleCharAttr(key), state: () => ({ checked: !!sh.getCharAttrs()[key] }) };
  }
  for (const [cmd, adjust] of Object.entries(ADJUST_COMMANDS)) {
    slots[cmd] = {
      exec: () => sh.setParaAttrs({ adjust }, "Align"),
      state: () => ({ checked: (sh.getParaAttrs().adjust ?? "left") === adjust }),
    };
  }
  for (const [cmd, lineHeight] of Object.entries(LINE_SPACING_COMMANDS)) {
    slots[cmd] = {
      exec: () => sh.setParaAttrs({ lineHeight }, "Line spacing"),
      state: () => ({ checked: (sh.getParaAttrs().lineHeight ?? 100) === lineHeight }),
    };
  }
  for (const [cmd, style] of Object.entries(STYLE_COMMANDS)) {
    slots[cmd] = { exec: () => sh.setParaStyle(style), state: () => ({ checked: sh.getParaStyle() === style }) };
  }

  return { name: "SwTextShell", slots };
}
