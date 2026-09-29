/**
 * SfxViewFrame — the frame hosting a document view (sfx2/source/view/viewfrm.cxx).
 * Controls outside the document (toolbar boxes, sidebar fields) use it to
 * hand the keyboard focus back to the document window when they are done.
 */
import { createContext, useContext } from "react";

export interface SfxViewFrame {
  grabFocus(): void;
}

export const SfxViewFrameContext = createContext<SfxViewFrame>({ grabFocus: () => {} });

export function useViewFrame(): SfxViewFrame {
  return useContext(SfxViewFrameContext);
}
