/**
 * Zoom slider in the status bar — counterpart of
 * svx/source/stbctrls/zoomsliderctrl.cxx (SvxZoomSliderControl).
 */
export const MIN_ZOOM = 20;
export const MAX_ZOOM = 600;

/** Zoom steps used by Zoom In / Zoom Out (basegfx zoomtools). */
const STEPS = [20, 25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500, 600];

export function zoomIn(z: number): number {
  return STEPS.find((s) => s > z) ?? MAX_ZOOM;
}

export function zoomOut(z: number): number {
  return [...STEPS].reverse().find((s) => s < z) ?? MIN_ZOOM;
}

export function SvxZoomSliderControl({ zoom, onZoom }: { zoom: number; onZoom: (z: number) => void }) {
  return (
    <div className="svx-zoomslider">
      <button aria-label="Zoom Out" title="Zoom Out" onClick={() => onZoom(zoomOut(zoom))}>
        −
      </button>
      <input
        type="range"
        aria-label="Zoom"
        min={MIN_ZOOM}
        max={300}
        value={Math.min(zoom, 300)}
        onChange={(e) => {
          const v = Number(e.target.value);
          onZoom(Math.abs(v - 100) <= 4 ? 100 : v);
        }}
      />
      <button aria-label="Zoom In" title="Zoom In" onClick={() => onZoom(zoomIn(zoom))}>
        +
      </button>
      <button
        style={{ width: "auto", padding: "0 4px" }}
        title="Reset zoom to 100%"
        onClick={() => onZoom(100)}
      >
        {Math.round(zoom)}%
      </button>
    </div>
  );
}
