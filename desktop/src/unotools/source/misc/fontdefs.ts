/**
 * Font substitution — like unotools/source/misc/fontdefs.cxx and VCL's
 * replacement table, maps LibreOffice's default fonts onto metric-compatible
 * fonts likely to be installed, ending in a CSS generic family.
 */
const SUBSTITUTES: Record<string, string[]> = {
  "Liberation Serif": ["Times New Roman", "Times", "serif"],
  "Liberation Sans": ["Arial", "Helvetica", "sans-serif"],
  "Liberation Mono": ["Courier New", "Menlo", "monospace"],
  "DejaVu Sans": ["Verdana", "sans-serif"],
  "DejaVu Serif": ["Georgia", "serif"],
  "Noto Sans": ["Helvetica", "Arial", "sans-serif"],
  "Noto Serif": ["Georgia", "serif"],
};

export function cssFontFamily(name: string | undefined): string {
  if (!name) return "serif";
  const chain = [name, ...(SUBSTITUTES[name] ?? ["sans-serif"])];
  return chain
    .map((f) => (["serif", "sans-serif", "monospace"].includes(f) ? f : `"${f}"`))
    .join(", ");
}

/** Fonts offered in the font name box. */
export const FONT_LIST: readonly string[] = [
  "Liberation Serif",
  "Liberation Sans",
  "Liberation Mono",
  "Arial",
  "Courier New",
  "DejaVu Sans",
  "DejaVu Serif",
  "Georgia",
  "Helvetica",
  "Menlo",
  "Noto Sans",
  "Noto Serif",
  "Palatino",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

/** Sizes offered in the font size box (FontSizeNames / FontList::GetStdSizeAry). */
export const FONT_SIZES: readonly number[] = [
  6, 7, 8, 9, 10, 10.5, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 54,
  60, 66, 72, 80, 88, 96,
];
