/**
 * Character panel of the Properties deck — counterpart of
 * svx/source/sidebar/text/TextPropertyPanel.cxx. Like upstream it contains
 * the same toolbar controllers as the Formatting toolbar.
 */
import { ToolBarItems, type ToolBarConfigEntry } from "../../../../framework/source/uielement/toolbarmanager";

const item = (command: string): ToolBarConfigEntry => ({ kind: "item", command });
const sep: ToolBarConfigEntry = { kind: "separator" };

export function TextPropertyPanel() {
  return (
    <section className="svx-panel" aria-label="Character">
      <div className="svx-panel-title">Character</div>
      <div className="svx-panel-row">
        <ToolBarItems entries={[item(".uno:CharFontName"), item(".uno:FontHeight")]} />
      </div>
      <div className="svx-panel-row">
        <ToolBarItems
          entries={[
            item(".uno:Bold"),
            item(".uno:Italic"),
            item(".uno:Underline"),
            item(".uno:Strikeout"),
            sep,
            item(".uno:SuperScript"),
            item(".uno:SubScript"),
            sep,
            item(".uno:ResetAttributes"),
          ]}
        />
      </div>
      <div className="svx-panel-row">
        <ToolBarItems entries={[item(".uno:FontColor"), item(".uno:CharBackColor")]} />
      </div>
    </section>
  );
}
