/**
 * Filter registry — counterpart of filter/source/config/fragments/filters/*.xcu
 * (writer8.xcu, OpenDocument_Text_Flat_XML.xcu, HTML__StarWriter_.xcu,
 * Text.xcu), restricted to the filters implemented so far.
 */
export interface SfxFilter {
  /** Internal filter name, as in the .xcu fragment. */
  readonly name: string;
  readonly uiName: string;
  readonly extensions: readonly string[];
  readonly mimeType: string;
  readonly import: boolean;
  readonly export: boolean;
}

export const WRITER_FILTERS: readonly SfxFilter[] = [
  {
    name: "writer8",
    uiName: "ODF Text Document",
    extensions: ["odt"],
    mimeType: "application/vnd.oasis.opendocument.text",
    import: true,
    export: true,
  },
  {
    name: "OpenDocument Text Flat XML",
    uiName: "Flat XML ODF Text Document",
    extensions: ["fodt"],
    mimeType: "application/vnd.oasis.opendocument.text-flat-xml",
    import: true,
    export: true,
  },
  {
    name: "HTML (StarWriter)",
    uiName: "HTML Document (Writer)",
    extensions: ["html", "htm"],
    mimeType: "text/html",
    import: false,
    export: true,
  },
  {
    name: "Text",
    uiName: "Text",
    extensions: ["txt"],
    mimeType: "text/plain",
    import: true,
    export: true,
  },
];

export const DEFAULT_FILTER = WRITER_FILTERS[0];

export function filterForPath(path: string): SfxFilter | undefined {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return WRITER_FILTERS.find((f) => f.extensions.includes(ext));
}
