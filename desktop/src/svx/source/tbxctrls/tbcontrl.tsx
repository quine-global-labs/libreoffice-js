/**
 * Toolbar controllers for the formatting toolbar — counterpart of
 * svx/source/tbxctrls/tbcontrl.cxx (SvxStyleToolBoxControl,
 * SvxFontNameToolBoxControl, SvxFontSizeBox) and
 * svx/source/tbxctrls/tbxcolor.cxx / PaletteManager (colour split buttons).
 */
import { useEffect, useState } from "react";
import {
  registerToolBoxController,
  tooltipFor,
  type ToolBoxControllerProps,
} from "../../../framework/source/uielement/toolbarmanager";
import { useDispatcher } from "../../../sfx2/source/control/dispatch";
import { useViewFrame } from "../../../sfx2/source/view/viewfrm";
import { FONT_LIST, FONT_SIZES, cssFontFamily } from "../../../unotools/source/misc/fontdefs";
import { ComboBox } from "../../../vcl/source/control/combobox";
import { CommandImage } from "../../../vcl/source/image/ImplImageTree";
import { ToolBoxSplitButton } from "../../../vcl/source/window/toolbox";

export interface StyleBoxEntry {
  uiName: string;
  preview?: { fontFamily?: string; fontSize?: string; fontWeight?: number };
}

/** Paragraph style box (.uno:StyleApply). State value: { current, styles }. */
export function SvxStyleBox({ command }: ToolBoxControllerProps) {
  const dispatcher = useDispatcher();
  const frame = useViewFrame();
  const state = dispatcher.queryState(command);
  const value = state.value as { current: string; styles: StyleBoxEntry[] } | undefined;
  const styles = value?.styles ?? [];
  return (
    <ComboBox
      label={tooltipFor(command)}
      width={180}
      disabled={!state.enabled}
      value={value?.current ?? ""}
      options={styles.map((s) => s.uiName)}
      optionStyle={(o) => styles.find((s) => s.uiName === o)?.preview}
      onCommit={(v) => dispatcher.execute(command, { Style: v, FamilyName: "ParagraphStyles" })}
      onDone={() => frame.grabFocus()}
    />
  );
}

/** Font name box (.uno:CharFontName). */
export function SvxFontNameBox({ command }: ToolBoxControllerProps) {
  const dispatcher = useDispatcher();
  const frame = useViewFrame();
  const state = dispatcher.queryState(command);
  return (
    <ComboBox
      label={tooltipFor(command)}
      width={180}
      disabled={!state.enabled}
      value={String(state.value ?? "")}
      options={FONT_LIST}
      optionStyle={(o) => ({ fontFamily: cssFontFamily(o), fontSize: 14 })}
      onCommit={(v) => dispatcher.execute(command, { CharFontName: v })}
      onDone={() => frame.grabFocus()}
    />
  );
}

/** Font size box (.uno:FontHeight). */
export function SvxFontSizeBox({ command }: ToolBoxControllerProps) {
  const dispatcher = useDispatcher();
  const frame = useViewFrame();
  const state = dispatcher.queryState(command);
  const size = state.value as number | undefined;
  return (
    <ComboBox
      label={tooltipFor(command)}
      width={70}
      disabled={!state.enabled}
      value={size ? `${size} pt` : ""}
      options={FONT_SIZES.map((s) => `${s} pt`)}
      onCommit={(v) => {
        const n = parseFloat(v);
        if (n >= 1 && n <= 999.9) dispatcher.execute(command, { FontHeight: Math.round(n * 10) / 10 });
      }}
      onDone={() => frame.grabFocus()}
    />
  );
}

/** LibreOffice's "standard" palette (extras/source/palettes/standard.soc), abridged. */
export const STANDARD_PALETTE: readonly (readonly [string, string])[] = [
  ["Black", "#000000"], ["Dark Gray 3", "#333333"], ["Dark Gray 2", "#666666"], ["Gray", "#808080"],
  ["Light Gray 1", "#999999"], ["Light Gray 2", "#b2b2b2"], ["Light Gray 3", "#cccccc"], ["Light Gray 4", "#dddddd"],
  ["Light Gray 5", "#eeeeee"], ["White", "#ffffff"], ["Dark Red 2", "#8d281e"], ["Dark Blue 2", "#1e3b5c"],
  ["Yellow", "#ffff00"], ["Gold", "#ffbf00"], ["Orange", "#ff8000"], ["Brick", "#ff4000"],
  ["Red", "#ff0000"], ["Magenta", "#bf0041"], ["Purple", "#800080"], ["Indigo", "#55308d"],
  ["Blue", "#2a6099"], ["Teal", "#158466"], ["Green", "#00a933"], ["Lime", "#81d41a"],
  ["Light Yellow 2", "#ffffa6"], ["Light Gold 2", "#ffe994"], ["Light Orange 2", "#ffb66c"], ["Light Brick 2", "#ffaa95"],
  ["Light Red 2", "#ffa6a6"], ["Light Magenta 2", "#ec9ba4"], ["Light Purple 2", "#bf819e"], ["Light Indigo 2", "#b7b3ca"],
  ["Light Blue 2", "#b4c7dc"], ["Light Teal 2", "#b3cac7"], ["Light Green 2", "#afd095"], ["Light Lime 2", "#e8f2a1"],
  ["Dark Yellow 2", "#996600"], ["Dark Gold 2", "#b47804"], ["Dark Orange 2", "#b85c00"], ["Dark Brick 2", "#be480a"],
  ["Dark Red 1", "#c9211e"], ["Dark Magenta 2", "#861141"], ["Dark Purple 2", "#650953"], ["Dark Indigo 2", "#43215f"],
  ["Dark Blue 1", "#355269"], ["Dark Teal 2", "#1e6a39"], ["Dark Green 2", "#127622"], ["Dark Lime 2", "#468a1a"],
];

const LAST_COLOR: Record<string, string> = {
  ".uno:FontColor": "#c9211e",
  ".uno:CharBackColor": "#ffff00",
};

/** Colour split button with palette popup (SvxColorToolBoxControl). */
export function SvxColorToolBoxControl({ command }: ToolBoxControllerProps) {
  const dispatcher = useDispatcher();
  const state = dispatcher.queryState(command);
  const [last, setLast] = useState(LAST_COLOR[command] ?? "#000000");
  const [popup, setPopup] = useState<{ x: number; y: number } | null>(null);
  const noneLabel = command === ".uno:FontColor" ? "Automatic" : "No Fill";

  useEffect(() => {
    if (!popup) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".svx-color-window")) setPopup(null);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [popup]);

  const apply = (color: string | null) => {
    setPopup(null);
    if (color) {
      setLast(color);
      LAST_COLOR[command] = color;
    }
    dispatcher.execute(command, { Color: color });
  };

  return (
    <>
      <ToolBoxSplitButton
        icon={
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
            <CommandImage command={command} size={16} />
            <span className="vcl-color-swatch" style={{ background: last }} />
          </span>
        }
        tooltip={tooltipFor(command)}
        disabled={!state.enabled}
        onClick={() => apply(last)}
        onDropDown={(e) => {
          const r = e.currentTarget.parentElement!.getBoundingClientRect();
          setPopup(popup ? null : { x: r.left, y: r.bottom + 2 });
        }}
      />
      {popup && (
        <div
          className="vcl-menu svx-color-window"
          style={{ left: popup.x, top: popup.y, minWidth: 0 }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button className="vcl-menu-item" onClick={() => apply(null)}>
            {noneLabel}
          </button>
          <div className="svx-palette">
            {STANDARD_PALETTE.map(([name, color]) => (
              <button
                key={color}
                title={name}
                aria-label={name}
                className="svx-palette-cell"
                style={{ background: color }}
                onClick={() => apply(color)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function registerSvxToolBoxControllers(): void {
  registerToolBoxController(".uno:StyleApply", SvxStyleBox);
  registerToolBoxController(".uno:CharFontName", SvxFontNameBox);
  registerToolBoxController(".uno:FontHeight", SvxFontSizeBox);
  registerToolBoxController(".uno:FontColor", SvxColorToolBoxControl);
  registerToolBoxController(".uno:CharBackColor", SvxColorToolBoxControl);
}
