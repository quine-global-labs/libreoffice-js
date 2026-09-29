/**
 * SwDocShell — loads and stores documents through the filters
 * (sw/source/uibase/app/docsh.cxx: ConvertFrom / ConvertTo). The UI flow
 * around it (dialogs, "save changes?") is in the view's object shell slots.
 */
import { strFromU8, strToU8 } from "fflate";
import {
  filterForPath,
  WRITER_FILTERS,
  type SfxFilter,
} from "../../../../filter/source/config/fragments/filters";
import type { SwDoc } from "../../../inc/doc";
import { importText } from "../../filter/ascii/parasc";
import { exportText } from "../../filter/ascii/wrtasc";
import { exportHtml } from "../../filter/html/wrthtml";
import { importFlatOdt, importOdt } from "../../filter/xml/swxml";
import { exportFlatOdt, exportOdt } from "../../filter/xml/wrtxml";

const byName = (name: string) => WRITER_FILTERS.find((f) => f.name === name)!;

/** Type detection (like filter/source/config type detection): extension, then content sniffing. */
export function detectFilter(path: string, bytes: Uint8Array): SfxFilter {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return byName("writer8"); // "PK" zip
  const byExt = filterForPath(path);
  if (byExt?.import) return byExt;
  const head = strFromU8(bytes.subarray(0, 512));
  if (head.includes("<office:document")) return byName("OpenDocument Text Flat XML");
  return byName("Text");
}

export function convertFrom(path: string, bytes: Uint8Array): { doc: SwDoc; filter: SfxFilter } {
  const filter = detectFilter(path, bytes);
  switch (filter.name) {
    case "writer8":
      return { doc: importOdt(bytes), filter };
    case "OpenDocument Text Flat XML":
      return { doc: importFlatOdt(strFromU8(bytes)), filter };
    default:
      return { doc: importText(strFromU8(bytes)), filter };
  }
}

export function convertTo(doc: SwDoc, filter: SfxFilter, title: string): Uint8Array {
  switch (filter.name) {
    case "writer8":
      return exportOdt(doc);
    case "OpenDocument Text Flat XML":
      return strToU8(exportFlatOdt(doc));
    case "HTML (StarWriter)":
      return strToU8(exportHtml(doc, title));
    default:
      return strToU8(exportText(doc));
  }
}

/** True if saving in this format loses formatting (the "Keep current format" warning). */
export function isAlienFormat(filter: SfxFilter): boolean {
  return filter.name !== "writer8" && filter.name !== "OpenDocument Text Flat XML";
}
