/**
 * Horizontal ruler — counterpart of svtools/source/control/ruler.cxx (drawn
 * by SvxRuler for Writer). Shows the page width, the margins and the current
 * paragraph's indents. Display-only for now (no dragging of indents/tabs).
 */
import { CM_TO_PX } from "../../../sw/inc/doc";

export interface RulerProps {
  pageWidth: number;
  marginLeft: number;
  marginRight: number;
  indentLeft: number;
  indentRight: number;
  /** Scale factor (1 = 100%). */
  scale: number;
}

export function Ruler({ pageWidth, marginLeft, marginRight, indentLeft, indentRight, scale }: RulerProps) {
  const px = (cm: number) => cm * CM_TO_PX * scale;
  const width = px(pageWidth);
  const textWidth = pageWidth - marginLeft - marginRight;
  const ticks = [];
  // Ticks every 0.25cm, numbered every cm, counted from the left margin.
  for (let q = -Math.floor(marginLeft * 4); q <= Math.floor((pageWidth - marginLeft) * 4); q++) {
    const x = px(marginLeft + q / 4);
    const major = q % 4 === 0;
    const half = q % 2 === 0;
    if (major && q !== 0) {
      ticks.push(
        <text key={q} x={x} y={14} textAnchor="middle" className="svt-ruler-num">
          {Math.abs(q / 4)}
        </text>,
      );
    } else if (!major) {
      ticks.push(<line key={q} x1={x} x2={x} y1={half ? 7 : 9} y2={half ? 15 : 13} className="svt-ruler-tick" />);
    }
  }
  const il = px(marginLeft + indentLeft);
  const ir = px(marginLeft + textWidth - indentRight);
  return (
    <div className="svt-ruler" aria-hidden>
      <svg width={width} height={22} style={{ display: "block", margin: "0 auto" }}>
        <rect x={0} y={3} width={width} height={16} className="svt-ruler-margin" />
        <rect x={px(marginLeft)} y={3} width={px(textWidth)} height={16} className="svt-ruler-text" />
        {ticks}
        <path d={`M${il - 5} 21 L${il + 5} 21 L${il} 15 Z`} className="svt-ruler-indent" />
        <path d={`M${ir - 5} 21 L${ir + 5} 21 L${ir} 15 Z`} className="svt-ruler-indent" />
      </svg>
    </div>
  );
}
