/**
 * Menus — counterpart of vcl/source/window/menu.cxx (MenuBar, PopupMenu).
 * Pure presentation: entries arrive already resolved (labels, state); the
 * command binding lives in framework's MenuBarManager.
 *
 * Menus swallow mousedown so the document keeps focus and selection while
 * they are used, like VCL's floating windows.
 */
import { Check, ChevronRight } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

export type VclMenuEntry =
  | { kind: "separator" }
  | {
      kind: "item";
      id: string;
      label: string;
      shortcut?: string;
      icon?: ReactNode;
      enabled: boolean;
      checked?: boolean;
      submenu?: VclMenuEntry[];
    };

const keepFocus = (e: ReactMouseEvent) => e.preventDefault();

interface MenuPopupProps {
  entries: VclMenuEntry[];
  x: number;
  y: number;
  onSelect: (id: string) => void;
}

function MenuPopup({ entries, x, y, onSelect }: MenuPopupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ x, y });
  const [openSub, setOpenSub] = useState<{ index: number; x: number; y: number } | null>(null);

  // Keep the popup on screen (FloatingWindow::ImplCalcPos).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPlace({
      x: Math.max(0, Math.min(x, window.innerWidth - r.width - 4)),
      y: Math.max(0, Math.min(y, window.innerHeight - r.height - 4)),
    });
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="vcl-menu"
      role="menu"
      style={{ left: place.x, top: place.y }}
      onMouseDown={keepFocus}
    >
      {entries.map((entry, i) => {
        if (entry.kind === "separator") return <div key={i} className="vcl-menu-separator" />;
        const open = openSub?.index === i;
        return (
          <div key={entry.id}>
            <button
              className="vcl-menu-item"
              role="menuitem"
              disabled={!entry.enabled}
              data-open={open ? "" : undefined}
              onMouseEnter={(e) => {
                if (entry.submenu && entry.enabled) {
                  const r = e.currentTarget.getBoundingClientRect();
                  setOpenSub({ index: i, x: r.right - 2, y: r.top - 5 });
                } else {
                  setOpenSub(null);
                }
              }}
              onClick={() => entry.enabled && !entry.submenu && onSelect(entry.id)}
            >
              <span className="vcl-menu-check">
                {entry.checked ? <Check size={14} /> : entry.icon}
              </span>
              <span className="vcl-menu-label">{entry.label}</span>
              {entry.shortcut && <span className="vcl-menu-accel">{entry.shortcut}</span>}
              {entry.submenu && <ChevronRight size={14} />}
            </button>
            {open && entry.submenu && (
              <MenuPopup entries={entry.submenu} x={openSub.x} y={openSub.y} onSelect={onSelect} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Closes on mousedown outside any menu, or on Escape. */
function useDismiss(active: boolean, onClose: () => void, inside: (t: Element) => boolean) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t || !inside(t)) close.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
    };
    const onBlur = () => close.current();
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [active, inside]);
}

const insideMenu = (t: Element) => !!t.closest(".vcl-menu, .vcl-menubar");

export interface VclMenuBarMenu {
  id: string;
  label: string;
  entries: () => VclMenuEntry[];
}

export function MenuBar({ menus, onSelect }: { menus: VclMenuBarMenu[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState<{ index: number; x: number; y: number } | null>(null);
  useDismiss(open !== null, () => setOpen(null), insideMenu);

  const openAt = (index: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setOpen({ index, x: r.left, y: r.bottom + 1 });
  };

  return (
    <div className="vcl-menubar" role="menubar" onMouseDown={keepFocus}>
      {menus.map((m, i) => (
        <button
          key={m.id}
          className="vcl-menubar-item"
          data-open={open?.index === i ? "" : undefined}
          onClick={(e) => (open?.index === i ? setOpen(null) : openAt(i, e.currentTarget))}
          onMouseEnter={(e) => open && open.index !== i && openAt(i, e.currentTarget)}
        >
          {m.label}
        </button>
      ))}
      {open && (
        <MenuPopup
          key={open.index}
          entries={menus[open.index].entries()}
          x={open.x}
          y={open.y}
          onSelect={(id) => {
            setOpen(null);
            onSelect(id);
          }}
        />
      )}
    </div>
  );
}

/** A context menu (PopupMenu::Execute). */
export function PopupMenu({
  entries,
  x,
  y,
  onSelect,
  onClose,
}: MenuPopupProps & { onClose: () => void }) {
  useDismiss(true, onClose, insideMenu);
  return (
    <MenuPopup
      entries={entries}
      x={x}
      y={y}
      onSelect={(id) => {
        onClose();
        onSelect(id);
      }}
    />
  );
}
