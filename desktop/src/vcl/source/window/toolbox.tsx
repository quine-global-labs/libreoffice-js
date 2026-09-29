/**
 * ToolBox — counterpart of vcl/source/window/toolbox.cxx. Buttons never take
 * focus (mousedown is swallowed) so the document keeps its selection.
 */
import { ChevronDown } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

const keepFocus = (e: ReactMouseEvent) => e.preventDefault();

export function ToolBox({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="vcl-toolbox" role="toolbar" aria-label={label}>
      {children}
    </div>
  );
}

export interface ToolBoxButtonProps {
  icon?: ReactNode;
  text?: string;
  tooltip: string;
  checked?: boolean;
  disabled?: boolean;
  onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}

export function ToolBoxButton({ icon, text, tooltip, checked, disabled, onClick }: ToolBoxButtonProps) {
  return (
    <button
      className="vcl-toolbox-button"
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={checked === undefined ? undefined : checked}
      disabled={disabled}
      onMouseDown={keepFocus}
      onClick={onClick}
    >
      {icon}
      {text && <span>{text}</span>}
    </button>
  );
}

/** A button with a drop-down arrow (ToolBoxItemBits::DROPDOWN). */
export function ToolBoxSplitButton({
  onDropDown,
  ...main
}: ToolBoxButtonProps & { onDropDown: (e: ReactMouseEvent<HTMLButtonElement>) => void }) {
  return (
    <span className="vcl-split-button">
      <ToolBoxButton {...main} />
      <ToolBoxButton
        icon={<ChevronDown size={12} />}
        tooltip={`${main.tooltip} options`}
        disabled={main.disabled}
        onClick={onDropDown}
      />
    </span>
  );
}

export function ToolBoxSeparator() {
  return <span className="vcl-toolbox-separator" role="separator" />;
}
