/**
 * SwView slots — view settings, zoom, dialogs and printing
 * (sw/source/uibase/uiview/view2.cxx, viewport.cxx, viewprt.cxx).
 */
import type { SfxShell, SfxSlot } from "../../../../sfx2/source/control/dispatch";
import { zoomIn, zoomOut } from "../../../../svx/source/stbctrls/zoomsliderctrl";

export type SwSidebarDeck = "properties" | "styles" | "navigator";
export type SwViewDialog = "find" | "wordcount" | "about";

export interface SwViewUi {
  zoom: number;
  ruler: boolean;
  statusBar: boolean;
  sidebar: boolean;
  deck: SwSidebarDeck;
  /** View > Formatting Marks. */
  marks: boolean;
}

export const DEFAULT_VIEW_UI: SwViewUi = {
  zoom: 100,
  ruler: true,
  statusBar: true,
  sidebar: true,
  deck: "properties",
  marks: false,
};

export interface SwViewContext {
  ui: SwViewUi;
  setUi: (update: (ui: SwViewUi) => SwViewUi) => void;
  openDialog: (dialog: SwViewDialog) => void;
}

export function createViewShell({ ui, setUi, openDialog }: SwViewContext): SfxShell {
  const toggle = (key: "ruler" | "statusBar" | "sidebar" | "marks"): SfxSlot => ({
    exec: () => setUi((u) => ({ ...u, [key]: !u[key] })),
    state: () => ({ checked: ui[key] }),
  });
  const deck = (id: SwSidebarDeck): SfxSlot => ({
    exec: () =>
      setUi((u) => (u.sidebar && u.deck === id ? { ...u, sidebar: false } : { ...u, sidebar: true, deck: id })),
    state: () => ({ checked: ui.sidebar && ui.deck === id }),
  });
  const print = { exec: () => window.print() };
  return {
    name: "SwView",
    slots: {
      ".uno:Ruler": toggle("ruler"),
      ".uno:StatusBarVisible": toggle("statusBar"),
      ".uno:Sidebar": toggle("sidebar"),
      ".uno:ControlCodes": toggle("marks"),
      ".uno:Navigator": deck("navigator"),
      ".uno:DesignerDialog": deck("styles"),
      ".uno:ZoomIn": { exec: () => setUi((u) => ({ ...u, zoom: zoomIn(u.zoom) })) },
      ".uno:ZoomOut": { exec: () => setUi((u) => ({ ...u, zoom: zoomOut(u.zoom) })) },
      ".uno:Zoom100Percent": { exec: () => setUi((u) => ({ ...u, zoom: 100 })) },
      ".uno:SearchDialog": { exec: () => openDialog("find") },
      ".uno:WordCountDialog": { exec: () => openDialog("wordcount") },
      ".uno:Print": print,
      // No PDF writer yet: the print dialog offers "Save as PDF" on every platform.
      ".uno:ExportDirectToPDF": print,
    },
  };
}
