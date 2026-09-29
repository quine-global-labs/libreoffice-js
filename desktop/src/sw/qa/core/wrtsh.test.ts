import { describe, expect, it } from "vitest";
import { getNodeText } from "../../inc/ndtxt";
import { collapsed, pos } from "../../inc/pam";
import { computeListLabels } from "../../source/core/doc/number";
import { countDoc } from "../../source/core/doc/DocumentStatisticsManager";
import { SwWrtShell } from "../../source/uibase/wrtsh/wrtsh";

const texts = (sh: SwWrtShell) => sh.doc.nodes.map(getNodeText);

function typed(text: string): SwWrtShell {
  const sh = new SwWrtShell();
  for (const ch of text) {
    if (ch === "\r") sh.splitNode();
    else sh.insert(ch);
  }
  return sh;
}

describe("SwWrtShell editing", () => {
  it("types, splits and joins paragraphs", () => {
    const sh = typed("Hello\rWorld");
    expect(texts(sh)).toEqual(["Hello", "World"]);
    sh.setSelection(collapsed(pos(1, 0)));
    sh.delLeft();
    expect(texts(sh)).toEqual(["HelloWorld"]);
    expect(sh.pam.point).toEqual(pos(0, 5));
    sh.delRight();
    expect(texts(sh)).toEqual(["Helloorld"]);
  });

  it("groups typing into one undo step", () => {
    const sh = typed("abc");
    sh.undo();
    expect(texts(sh)).toEqual([""]);
    sh.redo();
    expect(texts(sh)).toEqual(["abc"]);
  });

  it("applies bold to the word around a collapsed cursor", () => {
    const sh = typed("one two");
    sh.setSelection(collapsed(pos(0, 5)));
    sh.toggleCharAttr("bold");
    const runs = sh.doc.nodes[0].runs;
    expect(runs.map((r) => [r.text, !!r.attrs.bold])).toEqual([
      ["one ", false],
      ["two", true],
    ]);
  });

  it("keeps pending attributes for the next input", () => {
    const sh = typed("a");
    sh.toggleCharAttr("italic");
    sh.insert("b");
    expect(sh.doc.nodes[0].runs.map((r) => [r.text, !!r.attrs.italic])).toEqual([
      ["a", false],
      ["b", true],
    ]);
  });

  it("switches heading to body text on Enter at the end", () => {
    const sh = typed("Title");
    sh.setParaStyle("Heading_20_1");
    sh.splitNode();
    expect(sh.doc.nodes.map((n) => n.style)).toEqual(["Heading_20_1", "Text_20_body"]);
  });

  it("numbers list paragraphs and leaves the list on empty Enter", () => {
    const sh = typed("a\rb");
    sh.selectAll();
    sh.toggleList("number");
    expect(computeListLabels(sh.doc)).toEqual(["1.", "2."]);
    sh.setSelection(collapsed(pos(1, 1)));
    sh.splitNode();
    sh.splitNode();
    expect(sh.doc.nodes[2].attrs.list).toBeUndefined();
  });

  it("pastes multi-line text as paragraphs", () => {
    const sh = typed("[]");
    sh.setSelection(collapsed(pos(0, 1)));
    sh.insertPlainText("x\ny\nz");
    expect(texts(sh)).toEqual(["[x", "y", "z]"]);
    expect(sh.pam.point).toEqual(pos(2, 1));
  });

  it("finds and replaces all", () => {
    const sh = typed("cat Cat cat");
    expect(sh.replaceAll("cat", "dog", { matchCase: true })).toBe(2);
    expect(texts(sh)).toEqual(["dog Cat dog"]);
    expect(countDoc(sh.doc).words).toBe(3);
  });
});
