/**
 * SwView — the Writer view (sw/source/uibase/uiview/view.cxx). Owns the
 * edit window, the shell stack for the dispatcher and the view-level UI
 * (rulers, sidebar, status bar, dialogs). The surrounding frame chrome
 * (menu bar, toolbars) is laid out here too, from sw/uiconfig/swriter.
 */
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AboutDialog, PRODUCT_NAME } from "../../../../cui/source/dialogs/about";
import {
  ContextMenuManager,
  MenuBarManager,
  parseMenuXml,
} from "../../../../framework/source/uielement/menubarmanager";
import { parseToolBarXml, ToolBarManager } from "../../../../framework/source/uielement/toolbarmanager";
import {
  ACCELERATORS,
  keyEventToAccel,
} from "../../../../officecfg/registry/data/org/openoffice/Office/Accelerators";
import { createAppShell } from "../../../../sfx2/source/appl/appserv";
import { SfxDispatcher, SfxDispatcherContext } from "../../../../sfx2/source/control/dispatch";
import { StyleList } from "../../../../sfx2/source/dialog/StyleList";
import { startupDocument } from "../../../../sfx2/source/doc/docfile";
import { Sidebar } from "../../../../sfx2/source/sidebar/SidebarController";
import { SfxViewFrameContext, type SfxViewFrame } from "../../../../sfx2/source/view/viewfrm";
import { Ruler } from "../../../../svtools/source/control/ruler";
import { SvxSearchDialog, type SvxSearchItem } from "../../../../svx/source/dialog/srchdlg";
import { ParaPropertyPanel } from "../../../../svx/source/sidebar/paragraph/ParaPropertyPanel";
import { TextPropertyPanel } from "../../../../svx/source/sidebar/text/TextPropertyPanel";
import { SvxZoomSliderControl } from "../../../../svx/source/stbctrls/zoomsliderctrl";
import { MessageDialog } from "../../../../vcl/source/window/dialog";
import { StatusBar, StatusBarItem } from "../../../../vcl/source/window/status";
import { LIST_INDENT_CM } from "../../../../editeng/source/items/paraitem";
import { hasSelection } from "../../../inc/pam";
import { countDoc, countTexts } from "../../core/doc/DocumentStatisticsManager";
import { getParaStyle } from "../../core/doc/DocumentStylePoolManager";
import { pageOfNode } from "../../core/layout/layact";
import { SwWordCountDialog } from "../../ui/dialog/wordcountdialog";
import { createDocShellSlots, SwDocShell, type SfxInteraction } from "../app/docsh2";
import { SwEditWin, type SwEditWinHandle } from "../docvw/edtwin";
import { createTextShell } from "../shells/textsh";
import { SwNavigator } from "../utlui/navipi";
import { SwWrtShell } from "../wrtsh/wrtsh";
import { createViewShell, DEFAULT_VIEW_UI, type SwViewDialog, type SwViewUi } from "./view2";
import menubarXml from "../../../uiconfig/swriter/menubar/menubar.xml?raw";
import textPopupXml from "../../../uiconfig/swriter/popupmenu/text.xml?raw";
import standardbarXml from "../../../uiconfig/swriter/toolbar/standardbar.xml?raw";
import textobjectbarXml from "../../../uiconfig/swriter/toolbar/textobjectbar.xml?raw";
import "./view.css";

const MENUBAR = parseMenuXml(menubarXml);
const TEXT_POPUP = parseMenuXml(textPopupXml);
const STANDARDBAR = parseToolBarXml(standardbarXml);
const TEXTOBJECTBAR = parseToolBarXml(textobjectbarXml);

interface MessageRequest {
  message: string;
  secondary: string;
  buttons: { id: string; label: string; default?: boolean }[];
  resolve: (id: string) => void;
}

export function SwView() {
  const wrtShell = useMemo(() => new SwWrtShell(), []);
  const snapshot = useSyncExternalStore(wrtShell.subscribe, wrtShell.getSnapshot);
  const { doc, pam, modified } = snapshot;

  const [ui, setUi] = useState<SwViewUi>(DEFAULT_VIEW_UI);
  const [dialog, setDialog] = useState<SwViewDialog | null>(null);
  const [message, setMessage] = useState<MessageRequest | null>(null);
  const [pageStarts, setPageStarts] = useState<number[]>([0]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const editWin = useRef<SwEditWinHandle>(null);

  const interaction = useMemo<SfxInteraction>(
    () => ({
      query: (msg, secondary, buttons) =>
        new Promise((resolve) => setMessage({ message: msg, secondary, buttons, resolve })),
      error: (msg) => {
        const [first, ...rest] = msg.split("\n");
        setMessage({
          message: first,
          secondary: rest.join("\n"),
          buttons: [{ id: "ok", label: "OK", default: true }],
          resolve: () => {},
        });
      },
    }),
    [],
  );
  const docShell = useMemo(() => new SwDocShell(wrtShell, interaction), [wrtShell, interaction]);
  const info = useSyncExternalStore(docShell.subscribe, docShell.getInfo);

  const frame = useMemo<SfxViewFrame>(() => ({ grabFocus: () => editWin.current?.grabFocus() }), []);

  // --- Shell stack & dispatcher (rebuilt per render, like SfxBindings::Invalidate) ---
  const dispatcher = new SfxDispatcher(
    [
      createTextShell(wrtShell, {
        copy: async (cut) => editWin.current?.copy(cut),
        paste: async (unformatted) => editWin.current?.paste(unformatted),
      }),
      createViewShell({
        ui,
        setUi,
        openDialog: setDialog,
      }),
      createDocShellSlots(docShell, wrtShell),
      createAppShell({
        newDocument: () => docShell.newDoc(),
        openDocument: () => docShell.open(),
        showAbout: () => setDialog("about"),
      }),
    ],
    (command, error) => interaction.error(`${command} failed.\n${error}`),
  );
  const dispatcherRef = useRef(dispatcher);
  dispatcherRef.current = dispatcher;

  // --- Window title, close handling, startup document --------------------------
  useEffect(() => {
    const title = `${info.title} - ${PRODUCT_NAME} Writer`;
    document.title = title;
    if (isTauri()) void getCurrentWindow().setTitle(title);
  }, [info.title]);

  useEffect(() => {
    if (!isTauri()) {
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        if (wrtShell.getSnapshot().modified) e.preventDefault();
      };
      window.addEventListener("beforeunload", onBeforeUnload);
      return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }
    const win = getCurrentWindow();
    const unlisten = win.onCloseRequested(async (event) => {
      if (!wrtShell.getSnapshot().modified) return;
      event.preventDefault();
      if (await docShell.prepareClose()) await win.destroy();
    });
    return () => void unlisten.then((f) => f());
  }, [wrtShell, docShell]);

  useEffect(() => {
    void startupDocument().then((path) => {
      if (path) void docShell.openPath(path);
    });
    frame.grabFocus();
  }, [docShell, frame]);

  // Accelerators while focus is outside the document (sidebar, toolbars).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as Element | null;
      if (t?.closest(".sw-pages, input, select, textarea, [role=dialog]")) return;
      const command = ACCELERATORS[keyEventToAccel(e)];
      if (command && dispatcherRef.current.execute(command)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- Derived view state ----------------------------------------------------
  const docStat = useMemo(() => countDoc(doc), [doc]);
  const selStat = useMemo(
    () => (hasSelection(pam) ? countTexts(wrtShell.getSelectedText().split("\n")) : null),
    [pam, doc, wrtShell],
  );
  const currentPage = pageOfNode(pageStarts, pam.point.node) + 1;
  const para = wrtShell.getParaAttrs();
  const pointNode = doc.nodes[pam.point.node];
  const listIndent = pointNode.attrs.list ? (pointNode.attrs.listLevel ?? 1) * LIST_INDENT_CM : 0;

  const onSearch = (item: SvxSearchItem): string => {
    const opts = { matchCase: item.matchCase, wholeWords: item.wholeWords };
    let found = true;
    switch (item.command) {
      case "find":
        found = wrtShell.find(item.searchString, opts);
        break;
      case "findPrevious":
        found = wrtShell.find(item.searchString, { ...opts, backwards: true });
        break;
      case "replace":
        found = wrtShell.replace(item.searchString, item.replaceString, opts);
        break;
      case "replaceAll": {
        const n = wrtShell.replaceAll(item.searchString, item.replaceString, opts);
        return n ? `${n} match${n === 1 ? "" : "es"} replaced` : "Search key not found";
      }
    }
    editWin.current?.showCursor();
    return found ? "" : "Search key not found";
  };

  const gotoNode = (node: number) => {
    wrtShell.setSelection({ mark: { node, offset: 0 }, point: { node, offset: 0 } });
    frame.grabFocus();
    editWin.current?.showCursor();
  };

  return (
    <SfxDispatcherContext value={dispatcher}>
      <SfxViewFrameContext value={frame}>
        <div className="lo-app">
          <MenuBarManager config={MENUBAR} />
          <ToolBarManager config={STANDARDBAR} label="Standard" />
          <ToolBarManager config={TEXTOBJECTBAR} label="Formatting" />
          <div className="lo-workarea">
            <div className="lo-main">
              {ui.ruler && (
                <Ruler
                  pageWidth={doc.pageDesc.width}
                  marginLeft={doc.pageDesc.marginLeft}
                  marginRight={doc.pageDesc.marginRight}
                  indentLeft={(para.leftMargin ?? 0) + listIndent}
                  indentRight={para.rightMargin ?? 0}
                  scale={ui.zoom / 100}
                />
              )}
              <SwEditWin
                ref={editWin}
                shell={wrtShell}
                snapshot={snapshot}
                zoom={ui.zoom}
                showMarks={ui.marks}
                pageStarts={pageStarts}
                onLayout={setPageStarts}
                onCommand={(cmd) => dispatcher.execute(cmd)}
                onContextMenu={(x, y) => setContextMenu({ x, y })}
              />
            </div>
            {ui.sidebar && (
              <Sidebar
                current={ui.deck}
                onDeck={(deck) => setUi((u) => ({ ...u, deck: deck as SwViewUi["deck"] }))}
                onClose={() => setUi((u) => ({ ...u, sidebar: false }))}
                decks={[
                  {
                    id: "properties",
                    title: "Properties",
                    icon: ".uno:SidebarDeck.PropertyDeck",
                    content: (
                      <>
                        <TextPropertyPanel />
                        <ParaPropertyPanel />
                      </>
                    ),
                  },
                  { id: "styles", title: "Styles", icon: ".uno:DesignerDialog", content: <StyleList /> },
                  {
                    id: "navigator",
                    title: "Navigator",
                    icon: ".uno:Navigator",
                    content: <SwNavigator doc={doc} currentNode={pam.point.node} onGoto={gotoNode} />,
                  },
                ]}
              />
            )}
          </div>
          {ui.statusBar && (
            <StatusBar>
              <StatusBarItem width={110}>
                Page {currentPage} of {pageStarts.length}
              </StatusBarItem>
              <StatusBarItem width={200}>
                {selStat
                  ? `Selected: ${selStat.words} words, ${selStat.chars} characters`
                  : `${docStat.words} words, ${docStat.chars} characters`}
              </StatusBarItem>
              <StatusBarItem width={150}>{doc.pageDesc.name}</StatusBarItem>
              <StatusBarItem width={130}>{getParaStyle(pointNode.style).uiName}</StatusBarItem>
              <StatusBarItem>English (USA)</StatusBarItem>
              <StatusBarItem flex title={modified ? "The document has been modified." : undefined}>
                {modified ? "● Modified" : ""}
              </StatusBarItem>
              <StatusBarItem>
                <SvxZoomSliderControl zoom={ui.zoom} onZoom={(zoom) => setUi((u) => ({ ...u, zoom }))} />
              </StatusBarItem>
            </StatusBar>
          )}

          {contextMenu && (
            <ContextMenuManager
              config={TEXT_POPUP}
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
            />
          )}
          {dialog === "find" && (
            <SvxSearchDialog
              initialSearch={hasSelection(pam) && pam.mark.node === pam.point.node ? wrtShell.getSelectedText() : ""}
              onSearch={onSearch}
              onClose={() => {
                setDialog(null);
                frame.grabFocus();
              }}
            />
          )}
          {dialog === "wordcount" && (
            <SwWordCountDialog
              doc={docStat}
              selection={selStat}
              pages={pageStarts.length}
              onClose={() => setDialog(null)}
            />
          )}
          {dialog === "about" && <AboutDialog onClose={() => setDialog(null)} />}
          {message && (
            <MessageDialog
              title={PRODUCT_NAME}
              message={message.message}
              secondary={message.secondary}
              buttons={message.buttons}
              onResponse={(id) => {
                setMessage(null);
                message.resolve(id);
                frame.grabFocus();
              }}
            />
          )}
        </div>
      </SfxViewFrameContext>
    </SfxDispatcherContext>
  );
}

