/**
 * Keyboard shortcuts — counterpart of
 * officecfg/registry/data/org/openoffice/Office/Accelerators.xcu (the
 * Writer module list). "Mod" is Cmd on macOS and Ctrl elsewhere.
 */
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export const ACCELERATORS: Record<string, string> = {
  "Mod+N": ".uno:AddDirect",
  "Mod+O": ".uno:Open",
  "Mod+S": ".uno:Save",
  "Mod+Shift+S": ".uno:SaveAs",
  "Mod+P": ".uno:Print",
  "Mod+Z": ".uno:Undo",
  [IS_MAC ? "Mod+Shift+Z" : "Mod+Y"]: ".uno:Redo",
  "Mod+A": ".uno:SelectAll",
  "Mod+Alt+Shift+V": ".uno:PasteUnformatted",
  "Mod+H": ".uno:SearchDialog",
  "Mod+F": ".uno:SearchDialog",
  "Mod+B": ".uno:Bold",
  "Mod+I": ".uno:Italic",
  "Mod+U": ".uno:Underline",
  "Mod+Shift+P": ".uno:SuperScript",
  "Mod+Shift+B": ".uno:SubScript",
  "Mod+L": ".uno:LeftPara",
  "Mod+E": ".uno:CenterPara",
  "Mod+R": ".uno:RightPara",
  "Mod+J": ".uno:JustifyPara",
  "F12": ".uno:DefaultNumbering",
  "Shift+F12": ".uno:DefaultBullet",
  "Mod+M": ".uno:ResetAttributes",
  "Mod+0": ".uno:TextBodyParaStyle",
  "Mod+1": ".uno:Heading1ParaStyle",
  "Mod+2": ".uno:Heading2ParaStyle",
  "Mod+3": ".uno:Heading3ParaStyle",
  "Mod+Enter": ".uno:InsertPagebreak",
  "Mod+F10": ".uno:ControlCodes",
  "Mod+F5": ".uno:Sidebar",
  "F5": ".uno:Navigator",
  "F11": ".uno:DesignerDialog",
  "F7": ".uno:SpellingAndGrammarDialog",
  "Mod+Shift+R": ".uno:Ruler",
  "Mod+=": ".uno:ZoomIn",
  "Mod+-": ".uno:ZoomOut",
};

const CODE_KEYS: Record<string, string> = { Equal: "=", Minus: "-", Enter: "Enter", NumpadEnter: "Enter" };

/** Normalises a key event to the accelerator notation above. */
export function keyEventToAccel(e: KeyboardEvent | ReactKeyboardEvent): string {
  let key: string;
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code)) key = e.code.slice(5);
  else key = CODE_KEYS[e.code] ?? e.key;
  const mods = [
    (IS_MAC ? e.metaKey : e.ctrlKey) && "Mod",
    e.altKey && "Alt",
    e.shiftKey && "Shift",
  ].filter(Boolean);
  return [...mods, key].join("+");
}

const byCommand = new Map<string, string>();
for (const [accel, cmd] of Object.entries(ACCELERATORS)) if (!byCommand.has(cmd)) byCommand.set(cmd, accel);

/** Display form of a command's shortcut ("Ctrl+B" / "⌘B"). */
export function shortcutFor(cmd: string): string | undefined {
  const accel = byCommand.get(cmd);
  if (!accel) return undefined;
  if (!IS_MAC) return accel.replace("Mod", "Ctrl");
  return accel
    .replace("Mod+", "⌘")
    .replace("Shift+", "⇧")
    .replace("Alt+", "⌥")
    .replace("Enter", "↩");
}
