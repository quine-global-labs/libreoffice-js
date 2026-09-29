// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getNodeText } from "../../../inc/ndtxt";
import { collapsed, pos } from "../../../inc/pam";
import { importFlatOdt, importOdt } from "../../../source/filter/xml/swxml";
import { exportFlatOdt, exportOdt } from "../../../source/filter/xml/wrtxml";
import { SwWrtShell } from "../../../source/uibase/wrtsh/wrtsh";

function sample() {
  const sh = new SwWrtShell();
  sh.insert("Heading");
  sh.setParaStyle("Heading_20_1");
  sh.splitNode();
  sh.insert("Some  bold\ttext");
  sh.setSelection({ mark: pos(1, 6), point: pos(1, 10) });
  sh.toggleCharAttr("bold");
  sh.setSelection(collapsed(pos(1, 15)));
  sh.splitNode();
  sh.insert("item one");
  sh.toggleList("bullet");
  sh.splitNode();
  sh.insert("nested");
  sh.changeIndent(1);
  sh.insertPageBreak();
  sh.insert("centered");
  sh.setParaAttrs({ adjust: "center" });
  return sh.doc;
}

describe("ODF filters", () => {
  const doc = sample();

  for (const [name, roundtrip] of [
    ["fodt", () => importFlatOdt(exportFlatOdt(doc))],
    ["odt", () => importOdt(exportOdt(doc))],
  ] as const) {
    it(`round-trips ${name}`, () => {
      const back = roundtrip();
      expect(back.nodes.map(getNodeText)).toEqual(doc.nodes.map(getNodeText));
      expect(back.nodes.map((n) => n.style)).toEqual(doc.nodes.map((n) => n.style));
      expect(back.nodes[1].runs.map((r) => [r.text, !!r.attrs.bold])).toEqual([
        ["Some  ", false],
        ["bold", true],
        ["\ttext", false],
      ]);
      expect(back.nodes.map((n) => [n.attrs.list, n.attrs.listLevel])).toEqual([
        [undefined, undefined],
        [undefined, undefined],
        ["bullet", 1],
        ["bullet", 2],
        ["bullet", 2],
      ]);
      expect(back.nodes[4].attrs.pageBreakBefore).toBe(true);
      expect(back.nodes[4].attrs.adjust).toBe("center");
    });
  }
});
