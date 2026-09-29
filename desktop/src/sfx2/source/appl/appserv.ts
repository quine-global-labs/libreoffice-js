/**
 * Application-level slots — counterpart of sfx2/source/appl/appserv.cxx and
 * appopen.cxx (SID_NEWDOCDIRECT, SID_OPENDOC, SID_ABOUT, SID_QUITAPP).
 */
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { SfxShell } from "../control/dispatch";

export interface SfxApplicationContext {
  newDocument(): Promise<void>;
  openDocument(): Promise<void>;
  showAbout(): void;
}

export function createAppShell(ctx: SfxApplicationContext): SfxShell {
  // Closing the window goes through onCloseRequested, which asks to save.
  const quit = () => (isTauri() ? getCurrentWindow().close() : undefined);
  return {
    name: "SfxApplication",
    slots: {
      ".uno:AddDirect": { exec: () => ctx.newDocument() },
      ".uno:Open": { exec: () => ctx.openDocument() },
      ".uno:About": { exec: () => ctx.showAbout() },
      ...(isTauri()
        ? { ".uno:Quit": { exec: quit }, ".uno:CloseWin": { exec: quit } }
        : {}),
    },
  };
}
