/**
 * Paragraph panel of the Properties deck — counterpart of
 * svx/source/sidebar/paragraph/ParaPropertyPanel.cxx (alignment, lists,
 * indent, spacing and line spacing).
 */
import { useEffect, useState } from "react";
import { ToolBarItems, type ToolBarConfigEntry } from "../../../../framework/source/uielement/toolbarmanager";
import { useDispatcher } from "../../../../sfx2/source/control/dispatch";
import { useViewFrame } from "../../../../sfx2/source/view/viewfrm";

const item = (command: string): ToolBarConfigEntry => ({ kind: "item", command });
const sep: ToolBarConfigEntry = { kind: "separator" };

/** A metric field that commits on Enter / blur (vcl MetricField). */
function MetricField({
  label,
  unit,
  value,
  step,
  onCommit,
}: {
  label: string;
  unit: string;
  value: number;
  step: number;
  onCommit: (v: number) => void;
}) {
  const frame = useViewFrame();
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(+value.toFixed(2))), [value]);
  const commit = () => {
    const v = parseFloat(text);
    if (Number.isFinite(v) && v >= 0 && v !== value) onCommit(v);
    else setText(String(+value.toFixed(2)));
  };
  return (
    <div className="svx-panel-row">
      <label>{label}</label>
      <input
        className="vcl-field"
        type="number"
        min={0}
        step={step}
        style={{ width: 80 }}
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            frame.grabFocus();
          }
        }}
      />
      <span style={{ color: "var(--lo-text-dim)", marginLeft: 4 }}>{unit}</span>
    </div>
  );
}

const LINE_SPACINGS = [
  [".uno:SpacePara1", "Single"],
  [".uno:SpacePara115", "1.15 Lines"],
  [".uno:SpacePara15", "1.5 Lines"],
  [".uno:SpacePara2", "Double"],
] as const;

export function ParaPropertyPanel() {
  const dispatcher = useDispatcher();
  const frame = useViewFrame();
  const spacing = (dispatcher.queryState(".uno:ULSpacing").value ?? { upper: 0, lower: 0 }) as {
    upper: number;
    lower: number;
  };
  const indent = (dispatcher.queryState(".uno:LeftRightParaMargin").value ?? 0) as number;
  const lineSpacing = LINE_SPACINGS.find(([cmd]) => dispatcher.queryState(cmd).checked)?.[0] ?? "";

  return (
    <section className="svx-panel" aria-label="Paragraph">
      <div className="svx-panel-title">Paragraph</div>
      <div className="svx-panel-row">
        <ToolBarItems
          entries={[
            item(".uno:LeftPara"),
            item(".uno:CenterPara"),
            item(".uno:RightPara"),
            item(".uno:JustifyPara"),
            sep,
            item(".uno:DefaultBullet"),
            item(".uno:DefaultNumbering"),
            sep,
            item(".uno:IncrementIndent"),
            item(".uno:DecrementIndent"),
          ]}
        />
      </div>
      <MetricField
        label="Above"
        unit="pt"
        step={1}
        value={spacing.upper}
        onCommit={(v) => dispatcher.execute(".uno:ULSpacing", { Upper: v, Lower: spacing.lower })}
      />
      <MetricField
        label="Below"
        unit="pt"
        step={1}
        value={spacing.lower}
        onCommit={(v) => dispatcher.execute(".uno:ULSpacing", { Upper: spacing.upper, Lower: v })}
      />
      <MetricField
        label="Indent"
        unit="cm"
        step={0.25}
        value={indent}
        onCommit={(v) => dispatcher.execute(".uno:LeftRightParaMargin", { Left: v })}
      />
      <div className="svx-panel-row">
        <label htmlFor="svx-linespacing">Line spacing</label>
        <select
          id="svx-linespacing"
          className="vcl-field"
          value={lineSpacing}
          onChange={(e) => {
            dispatcher.execute(e.target.value);
            frame.grabFocus();
          }}
        >
          {lineSpacing === "" && <option value="">Proportional</option>}
          {LINE_SPACINGS.map(([cmd, label]) => (
            <option key={cmd} value={cmd}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
