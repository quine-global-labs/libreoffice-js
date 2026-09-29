/** ODF XML namespaces (include/xmloff/xmlnamespace.hxx). */
export const NS = {
  office: "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
  style: "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
  text: "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
  table: "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
  fo: "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
  svg: "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0",
  meta: "urn:oasis:names:tc:opendocument:xmlns:meta:1.0",
  dc: "http://purl.org/dc/elements/1.1/",
  manifest: "urn:oasis:names:tc:opendocument:xmlns:manifest:1.0",
} as const;

export const ODT_MIMETYPE = "application/vnd.oasis.opendocument.text";

export const NS_DECLS = (["office", "style", "text", "table", "fo", "svg", "meta", "dc"] as const)
  .map((p) => `xmlns:${p}="${NS[p]}"`)
  .join(" ");
