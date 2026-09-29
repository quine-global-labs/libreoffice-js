/**
 * Dialog — counterpart of vcl/source/window/dialog.cxx. `modal` dialogs get
 * an overlay (Dialog::Execute); modeless ones float and can be dragged by
 * their title bar, like the Find & Replace or Word Count dialogs.
 */
import { X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

export interface DialogProps {
  title: string;
  modal?: boolean;
  width?: number;
  onClose: () => void;
  buttons?: ReactNode;
  children: ReactNode;
}

export function Dialog({ title, modal, width, onClose, buttons, children }: DialogProps) {
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.contains(document.activeElement)) {
        e.preventDefault();
        close.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const startDrag = (e: ReactMouseEvent) => {
    if (modal || (e.target as Element).closest("button")) return;
    const r = ref.current!.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    const move = (ev: MouseEvent) =>
      setOffset({
        x: Math.max(0, Math.min(ev.clientX - dx, window.innerWidth - 80)),
        y: Math.max(0, Math.min(ev.clientY - dy, window.innerHeight - 40)),
      });
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  const dialog = (
    <div
      ref={ref}
      className="vcl-dialog"
      role="dialog"
      aria-label={title}
      aria-modal={modal}
      style={{
        width,
        ...(modal ? {} : offset ? { left: offset.x, top: offset.y } : { right: 32, top: 120 }),
      }}
    >
      <div className="vcl-dialog-title" onMouseDown={startDrag}>
        <span>{title}</span>
        <button aria-label="Close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="vcl-dialog-body">{children}</div>
      {buttons && <div className="vcl-dialog-buttons">{buttons}</div>}
    </div>
  );

  return modal ? <div className="vcl-dialog-overlay">{dialog}</div> : dialog;
}

/** A message box with custom buttons (vcl MessageDialog / weld::MessageDialog). */
export function MessageDialog({
  title,
  message,
  secondary,
  buttons,
  onResponse,
}: {
  title: string;
  message: string;
  secondary?: string;
  buttons: { id: string; label: string; default?: boolean }[];
  onResponse: (id: string) => void;
}) {
  const cancel = buttons.find((b) => b.id === "cancel")?.id ?? buttons[buttons.length - 1].id;
  return (
    <Dialog
      title={title}
      modal
      width={420}
      onClose={() => onResponse(cancel)}
      buttons={buttons.map((b) => (
        <button
          key={b.id}
          className="vcl-button"
          data-default={b.default ? "" : undefined}
          autoFocus={b.default}
          onClick={() => onResponse(b.id)}
        >
          {b.label}
        </button>
      ))}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>{message}</p>
      {secondary && <p style={{ margin: "8px 0 0", color: "var(--lo-text-dim)" }}>{secondary}</p>}
    </Dialog>
  );
}
