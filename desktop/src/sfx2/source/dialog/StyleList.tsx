/**
 * Styles deck — counterpart of sfx2/source/dialog/StyleList.cxx (the style
 * list shared by the Styles sidebar deck and the old Stylist). Paragraph
 * styles only for now; applying dispatches .uno:StyleApply like upstream.
 */
import type { CSSProperties } from "react";
import { useDispatcher } from "../control/dispatch";
import { useViewFrame } from "../view/viewfrm";

export interface SfxStyleListEntry {
  uiName: string;
  preview?: CSSProperties;
}

export function StyleList() {
  const dispatcher = useDispatcher();
  const frame = useViewFrame();
  const state = dispatcher.queryState(".uno:StyleApply");
  const value = state.value as { current: string; styles: SfxStyleListEntry[] } | undefined;
  return (
    <div className="sfx-stylelist">
      <div className="sfx-stylelist-family">Paragraph Styles</div>
      <ul role="listbox" aria-label="Paragraph Styles">
        {(value?.styles ?? []).map((s) => (
          <li
            key={s.uiName}
            role="option"
            aria-selected={s.uiName === value?.current}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              dispatcher.execute(".uno:StyleApply", { Style: s.uiName, FamilyName: "ParagraphStyles" });
              frame.grabFocus();
            }}
          >
            <span style={s.preview}>{s.uiName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
