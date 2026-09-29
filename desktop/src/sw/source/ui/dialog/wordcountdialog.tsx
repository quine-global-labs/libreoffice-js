/**
 * Tools > Word Count — counterpart of sw/source/ui/dialog/wordcountdialog.cxx.
 * Modeless and live-updating, like upstream.
 */
import { Dialog } from "../../../../vcl/source/window/dialog";
import type { SwDocStat } from "../../core/doc/DocumentStatisticsManager";

const fmt = (n: number) => n.toLocaleString();

export function SwWordCountDialog({
  doc,
  selection,
  pages,
  onClose,
}: {
  doc: SwDocStat;
  selection: SwDocStat | null;
  pages: number;
  onClose: () => void;
}) {
  const rows: [string, (s: SwDocStat) => number][] = [
    ["Words", (s) => s.words],
    ["Characters including spaces", (s) => s.chars],
    ["Characters excluding spaces", (s) => s.charsExclSpaces],
    ["Paragraphs", (s) => s.paragraphs],
  ];
  return (
    <Dialog
      title="Word and Character Count"
      width={420}
      onClose={onClose}
      buttons={
        <button className="vcl-button" data-default="" onClick={onClose}>
          Close
        </button>
      }
    >
      <table className="sw-wordcount">
        <thead>
          <tr>
            <th />
            <th>Selection</th>
            <th>Document</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, get]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{selection ? fmt(get(selection)) : 0}</td>
              <td>{fmt(get(doc))}</td>
            </tr>
          ))}
          <tr>
            <th>Pages</th>
            <td />
            <td>{fmt(pages)}</td>
          </tr>
        </tbody>
      </table>
    </Dialog>
  );
}
