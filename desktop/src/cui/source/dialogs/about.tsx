/** Help > About — counterpart of cui/source/dialogs/about.cxx (AboutDialog). */
import { Dialog } from "../../../vcl/source/window/dialog";

export const PRODUCT_NAME = "LibreOffice JS";
export const PRODUCT_VERSION = "0.1.0";

export function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      title={`About ${PRODUCT_NAME}`}
      modal
      width={440}
      onClose={onClose}
      buttons={
        <button className="vcl-button" data-default="" autoFocus onClick={onClose}>
          Close
        </button>
      }
    >
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <svg width="56" height="56" viewBox="0 0 1024 1024" aria-hidden>
          <rect x="64" y="64" width="896" height="896" rx="200" fill="#1c5fa8" />
          <path d="M300 200h300l160 160v464a40 40 0 0 1-40 40H300a40 40 0 0 1-40-40V240a40 40 0 0 1 40-40z" fill="#fff" />
          <g fill="#1c5fa8">
            <rect x="340" y="440" width="340" height="36" rx="18" />
            <rect x="340" y="520" width="340" height="36" rx="18" />
            <rect x="340" y="600" width="340" height="36" rx="18" />
          </g>
        </svg>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{PRODUCT_NAME} Writer</div>
          <div style={{ color: "var(--lo-text-dim)", marginTop: 2 }}>Version {PRODUCT_VERSION}</div>
          <p style={{ margin: "12px 0 0" }}>
            A word processor built with Tauri and React, structured after LibreOffice's core modules
            (sw, sfx2, framework, vcl, svx, editeng, …).
          </p>
          <p style={{ margin: "8px 0 0", color: "var(--lo-text-dim)" }}>
            LibreOffice is a trademark of The Document Foundation. This project is not affiliated with it.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
