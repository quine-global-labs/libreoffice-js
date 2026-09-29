/**
 * SwEditWin — the document window (sw/source/uibase/docvw/edtwin.cxx).
 * Upstream it receives raw key/mouse events and turns them into SwWrtShell
 * calls. Here the page area is a contentEditable host whose DOM is fully
 * owned by React: every native edit is cancelled in `beforeinput` and
 * replayed on the model, then re-rendered. The browser still provides caret
 * movement, selection, IME and spell checking.
 *
 * The page layout (SwRootFrame → SwPageFrame → SwTextFrame) is rendered here
 * too; paragraph heights are measured after each render to paginate.
 */
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type Ref,
} from "react";
import {
  ACCELERATORS,
  keyEventToAccel,
} from "../../../../officecfg/registry/data/org/openoffice/Office/Accelerators";
import { CM_TO_PX } from "../../../inc/doc";
import { hasSelection, pamEquals, type SwPaM } from "../../../inc/pam";
import { computeListLabels } from "../../core/doc/number";
import { bodyHeightPx, calcPageStarts, sameStarts } from "../../core/layout/layact";
import {
  caretRect,
  domToPos,
  pamToRange,
  readDomSelection,
  writeDomSelection,
} from "../../core/layout/trvlfrm";
import { SwTextFrame } from "../../core/text/txtfrm";
import {
  copyToSystemClipboard,
  readSystemClipboard,
  readTransferable,
  writeTransferable,
} from "../dochdl/swdtflvr";
import type { SwShellSnapshot, SwWrtShell } from "../wrtsh/wrtsh";
import "./edtwin.css";

export interface SwEditWinHandle {
  grabFocus(): void;
  /** Scrolls the cursor into view (after the next render). */
  showCursor(): void;
  copy(cut: boolean): Promise<void>;
  paste(unformatted: boolean): Promise<void>;
}

interface SwEditWinProps {
  shell: SwWrtShell;
  snapshot: SwShellSnapshot;
  /** Zoom in percent. */
  zoom: number;
  showMarks: boolean;
  pageStarts: readonly number[];
  onLayout: (pageStarts: number[]) => void;
  /** Executes an accelerator's command; returns false if unhandled. */
  onCommand: (command: string) => boolean;
  onContextMenu: (x: number, y: number) => void;
  ref?: Ref<SwEditWinHandle>;
}

const PAGE_GAP_PX = 16;
const INACTIVE_SELECTION = "sw-inactive-selection";

export function SwEditWin({
  shell,
  snapshot,
  zoom,
  showMarks,
  pageStarts,
  onLayout,
  onCommand,
  onContextMenu,
  ref,
}: SwEditWinProps) {
  const { doc, pam } = snapshot;
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composing = useRef<SwPaM | null>(null);
  const lastPam = useRef(pam);
  const latest = useRef({ shell, onCommand });
  latest.current = { shell, onCommand };
  const [epoch, setEpoch] = useState(0);
  const [focused, setFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [fontsLoaded, setFontsLoaded] = useState(0);

  const labels = useMemo(() => computeListLabels(doc), [doc]);
  const scale = zoom / 100;
  const pd = doc.pageDesc;

  // Page starts may lag one render behind the document; keep them valid.
  const starts = pageStarts.filter((s, i) => s < doc.nodes.length && (i === 0 ? s === 0 : s > pageStarts[i - 1]));
  if (starts[0] !== 0) starts.unshift(0);

  const isFocused = () => document.activeElement === rootRef.current;

  /** Scrolls the scroll window so the cursor is visible (SwView::CalcVisArea). */
  const ensureCursorVisible = () => {
    const root = rootRef.current;
    const sc = scrollRef.current;
    if (!root || !sc) return;
    const rect = caretRect(root, latest.current.shell.pam.point);
    if (!rect) return;
    const view = sc.getBoundingClientRect();
    if (rect.top < view.top + 8 || rect.bottom > view.bottom - 8) {
      sc.scrollTop += rect.top - view.top - view.height / 3;
    }
  };

  const syncSelectionFromDom = () => {
    const root = rootRef.current;
    const domPam = root && readDomSelection(root);
    if (domPam) latest.current.shell.setSelection(domPam);
  };

  useImperativeHandle(ref, () => ({
    grabFocus() {
      const root = rootRef.current;
      if (!root) return;
      root.focus({ preventScroll: true });
      writeDomSelection(root, latest.current.shell.pam);
    },
    showCursor() {
      requestAnimationFrame(ensureCursorVisible);
    },
    async copy(cut) {
      const sh = latest.current.shell;
      if (!hasSelection(sh.pam)) return;
      await copyToSystemClipboard(sh.copySelection());
      if (cut) sh.deleteRange(sh.pam);
    },
    async paste(unformatted) {
      const content = await readSystemClipboard();
      const sh = latest.current.shell;
      if (content.fragment && !unformatted) sh.insertFragment(content.fragment);
      else if (content.text) sh.insertPlainText(content.text);
    },
  }));

  // After every render: paginate from measured heights, then put the DOM
  // selection where the model says it is.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const heights: number[] = [];
    root.querySelectorAll<HTMLElement>(".sw-para").forEach((el) => {
      heights[Number(el.dataset.swNode)] = el.offsetHeight;
    });
    const measured = calcPageStarts(doc, heights);
    if (!sameStarts(measured, pageStarts)) onLayout(measured);
    if (root.offsetHeight !== contentHeight) setContentHeight(root.offsetHeight);

    if (!composing.current && isFocused()) {
      const domPam = readDomSelection(root);
      if (!domPam || !pamEquals(domPam, pam)) writeDomSelection(root, pam);
      if (lastPam.current !== pam) ensureCursorVisible();
    }
    lastPam.current = pam;
  });

  // Re-measure once web fonts have loaded (line heights change).
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsLoaded((n) => n + 1));
  }, []);
  void fontsLoaded;

  // Show the selection while focus is elsewhere (toolbar boxes, dialogs).
  useEffect(() => {
    const root = rootRef.current;
    if (typeof CSS === "undefined" || !("highlights" in CSS) || !root) return;
    const range = !focused && hasSelection(pam) ? pamToRange(root, pam) : null;
    if (range) CSS.highlights.set(INACTIVE_SELECTION, new Highlight(range));
    else CSS.highlights.delete(INACTIVE_SELECTION);
  }, [focused, pam, doc, epoch]);

  // DOM selection → model.
  useEffect(() => {
    const onSelectionChange = () => {
      if (composing.current || !isFocused()) return;
      syncSelectionFromDom();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  // Native editing events (React's onBeforeInput is not the InputEvent API).
  useEffect(() => {
    const root = rootRef.current!;

    const targetPam = (e: InputEvent): SwPaM | null => {
      const r = e.getTargetRanges()[0];
      if (!r) return null;
      const mark = domToPos(root, r.startContainer, r.startOffset);
      const point = domToPos(root, r.endContainer, r.endOffset);
      return mark && point ? { mark, point } : null;
    };

    const onBeforeInput = (e: InputEvent) => {
      if (
        e.inputType === "insertCompositionText" ||
        e.inputType === "deleteCompositionText" ||
        e.inputType === "insertFromComposition"
      ) {
        return; // IME: let the browser draw; committed in compositionend.
      }
      e.preventDefault();
      const sh = latest.current.shell;
      syncSelectionFromDom();
      switch (e.inputType) {
        case "insertText":
          if (e.data) sh.insert(e.data);
          break;
        case "insertReplacementText": {
          const text = e.data ?? e.dataTransfer?.getData("text/plain") ?? "";
          sh.replaceRange(targetPam(e) ?? sh.pam, text, "Autocorrect");
          break;
        }
        case "insertParagraph":
          sh.splitNode();
          break;
        case "insertLineBreak":
          sh.insertLineBreak();
          break;
        case "deleteContentBackward":
          sh.delLeft();
          break;
        case "deleteContentForward":
          sh.delRight();
          break;
        case "deleteWordBackward":
        case "deleteWordForward":
        case "deleteSoftLineBackward":
        case "deleteSoftLineForward":
        case "deleteHardLineBackward":
        case "deleteHardLineForward":
        case "deleteEntireSoftLine":
        case "deleteContent": {
          const r = targetPam(e);
          if (hasSelection(sh.pam)) sh.deleteRange(sh.pam);
          else if (r && hasSelection(r)) sh.deleteRange(r);
          else if (e.inputType.endsWith("Backward")) sh.delLeft();
          else sh.delRight();
          break;
        }
        case "historyUndo":
          sh.undo();
          break;
        case "historyRedo":
          sh.redo();
          break;
        case "formatBold":
          sh.toggleCharAttr("bold");
          break;
        case "formatItalic":
          sh.toggleCharAttr("italic");
          break;
        case "formatUnderline":
          sh.toggleCharAttr("underline");
          break;
        case "formatStrikeThrough":
          sh.toggleCharAttr("strikeout");
          break;
        default:
          // insertFromPaste / insertFromDrop are handled by paste/drop.
          break;
      }
    };

    const onCompositionStart = () => {
      composing.current = readDomSelection(root) ?? latest.current.shell.pam;
    };
    const onCompositionEnd = (e: CompositionEvent) => {
      const start = composing.current;
      const data = e.data ?? "";
      // Let the browser finish its own composition DOM work, then replay the
      // result on the model and rebuild the pages the IME touched.
      setTimeout(() => {
        composing.current = null;
        const sh = latest.current.shell;
        if (start && (data || hasSelection(start))) sh.replaceRange(start, data, "Typing", "typing");
        setEpoch((n) => n + 1);
      }, 0);
    };

    root.addEventListener("beforeinput", onBeforeInput);
    root.addEventListener("compositionstart", onCompositionStart);
    root.addEventListener("compositionend", onCompositionEnd);
    return () => {
      root.removeEventListener("beforeinput", onBeforeInput);
      root.removeEventListener("compositionstart", onCompositionStart);
      root.removeEventListener("compositionend", onCompositionEnd);
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.isComposing || composing.current) return;
    const command = ACCELERATORS[keyEventToAccel(e)];
    if (command) {
      syncSelectionFromDom();
      if (onCommand(command)) e.preventDefault();
      return;
    }
    if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      syncSelectionFromDom();
      const sh = latest.current.shell;
      if (sh.doc.nodes[sh.pam.point.node].attrs.list) sh.changeIndent(e.shiftKey ? -1 : 1);
      else if (!e.shiftKey) sh.insert("\t");
    }
  };

  const onCopy = (e: ClipboardEvent<HTMLDivElement>, cut: boolean) => {
    e.preventDefault();
    syncSelectionFromDom();
    const sh = latest.current.shell;
    if (!hasSelection(sh.pam)) return;
    writeTransferable(e.clipboardData, sh.copySelection());
    if (cut) sh.deleteRange(sh.pam);
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    syncSelectionFromDom();
    const content = readTransferable(e.clipboardData);
    const sh = latest.current.shell;
    if (content.fragment) sh.insertFragment(content.fragment);
    else if (content.text) sh.insertPlainText(content.text);
  };

  const pageW = pd.width * CM_TO_PX;
  const pageH = pd.height * CM_TO_PX;

  return (
    <div
      ref={scrollRef}
      className="sw-scrollwin"
      onMouseDown={(e) => {
        // Clicks on the grey background just focus the document.
        if (e.target === e.currentTarget || (e.target as Element).classList.contains("sw-sizer")) {
          e.preventDefault();
          rootRef.current?.focus({ preventScroll: true });
        }
      }}
    >
      <div
        className="sw-sizer"
        style={{ width: pageW * scale, height: (contentHeight || pageH) * scale }}
      >
        <div
          ref={rootRef}
          className={showMarks ? "sw-pages sw-show-marks" : "sw-pages"}
          style={{ width: pageW, transform: `scale(${scale})` }}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          role="textbox"
          aria-multiline
          aria-label="Document"
          onKeyDown={onKeyDown}
          onCopy={(e) => onCopy(e, false)}
          onCut={(e) => onCopy(e, true)}
          onPaste={onPaste}
          onDragStart={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onFocus={() => {
            setFocused(true);
            if (rootRef.current) writeDomSelection(rootRef.current, latest.current.shell.pam);
          }}
          onBlur={() => setFocused(false)}
          onContextMenu={(e) => {
            e.preventDefault();
            syncSelectionFromDom();
            onContextMenu(e.clientX, e.clientY);
          }}
        >
          {starts.map((start, p) => {
            const end = starts[p + 1] ?? doc.nodes.length;
            return (
              <div
                key={`${epoch}:${p}`}
                className="sw-page"
                style={{
                  minHeight: pageH,
                  marginBottom: PAGE_GAP_PX,
                  padding: `${pd.marginTop}cm ${pd.marginRight}cm ${pd.marginBottom}cm ${pd.marginLeft}cm`,
                }}
              >
                <div className="sw-body" style={{ minHeight: bodyHeightPx(pd) }}>
                  {doc.nodes.slice(start, end).map((node, j) => (
                    <SwTextFrame key={node.id} node={node} index={start + j} label={labels[start + j]} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
