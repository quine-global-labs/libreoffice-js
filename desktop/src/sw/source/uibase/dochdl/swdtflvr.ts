/**
 * SwTransferable — clipboard data for Writer (sw/source/uibase/dochdl/swdtflvr.cxx).
 * Offers text/plain and text/html to other applications and keeps the
 * copied fragment itself, so copy & paste inside the app is lossless.
 */
import { getNodeText, type SwTextNode } from "../../../inc/ndtxt";
import { exportHtmlFragment } from "../../filter/html/wrthtml";

let internal: { text: string; fragment: SwTextNode[] } | null = null;

export interface SwClipboardContent {
  text: string;
  /** Present when the clipboard holds a fragment copied from this app. */
  fragment?: SwTextNode[];
}

function remember(fragment: SwTextNode[]): { text: string; html: string } {
  const text = fragment.map(getNodeText).join("\n");
  internal = { text, fragment };
  return { text, html: exportHtmlFragment(fragment) };
}

function recall(text: string): SwClipboardContent {
  const norm = (s: string) => s.replace(/\r\n?/g, "\n");
  return internal && norm(internal.text) === norm(text) ? { text, fragment: internal.fragment } : { text };
}

/** Fills a copy/cut event's DataTransfer. */
export function writeTransferable(dt: DataTransfer, fragment: SwTextNode[]): void {
  const { text, html } = remember(fragment);
  dt.setData("text/plain", text);
  dt.setData("text/html", html);
}

export function readTransferable(dt: DataTransfer): SwClipboardContent {
  return recall(dt.getData("text/plain"));
}

/** Copy via the async Clipboard API (menu / toolbar Copy). */
export async function copyToSystemClipboard(fragment: SwTextNode[]): Promise<void> {
  const { text, html } = remember(fragment);
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
  } else {
    await navigator.clipboard.writeText(text);
  }
}

/** Paste via the async Clipboard API (menu / toolbar Paste). */
export async function readSystemClipboard(): Promise<SwClipboardContent> {
  return recall(await navigator.clipboard.readText());
}
