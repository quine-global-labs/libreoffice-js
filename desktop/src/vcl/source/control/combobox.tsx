/**
 * ComboBox — an editable field with a drop-down list
 * (vcl/source/control/combobox.cxx). Commits on Enter or list selection,
 * reverts on Escape; `onDone` lets the caller hand focus back to the document.
 */
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export interface ComboBoxProps {
  value: string;
  options: readonly string[];
  width: number;
  label: string;
  disabled?: boolean;
  /** Custom rendering of a list entry (e.g. a font preview). */
  renderOption?: (option: string) => ReactNode;
  optionStyle?: (option: string) => CSSProperties | undefined;
  onCommit: (value: string) => void;
  onDone?: () => void;
}

export function ComboBox({
  value,
  options,
  width,
  label,
  disabled,
  renderOption,
  optionStyle,
  onCommit,
  onDone,
}: ComboBoxProps) {
  const [text, setText] = useState(value);
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<{ x: number; y: number; w: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setText(value);
  }, [value, editing]);

  useEffect(() => {
    if (!list) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest(".vcl-combobox-list") && !boxRef.current?.contains(t)) setList(null);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [list]);

  const commit = (v: string) => {
    setEditing(false);
    setList(null);
    if (v.trim()) onCommit(v.trim());
    else setText(value);
    onDone?.();
  };

  const toggleList = () => {
    if (list) return setList(null);
    const r = boxRef.current!.getBoundingClientRect();
    setList({ x: r.left, y: r.bottom + 2, w: Math.max(r.width, 160) });
  };

  return (
    <div className="vcl-combobox" ref={boxRef} style={{ width }}>
      <input
        ref={inputRef}
        value={text}
        aria-label={label}
        title={label}
        disabled={disabled}
        spellCheck={false}
        onFocus={(e) => {
          setEditing(true);
          e.currentTarget.select();
        }}
        onBlur={() => {
          setEditing(false);
          setText(value);
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(text);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setText(value);
            setEditing(false);
            setList(null);
            onDone?.();
          } else if (e.key === "ArrowDown" && e.altKey) {
            toggleList();
          }
        }}
      />
      <button
        className="vcl-combobox-drop"
        tabIndex={-1}
        disabled={disabled}
        aria-label={`${label} list`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleList}
      >
        <ChevronDown size={12} />
      </button>
      {list && (
        <div
          className="vcl-combobox-list"
          role="listbox"
          style={{ left: list.x, top: list.y, minWidth: list.w }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.map((o) => (
            <div
              key={o}
              role="option"
              aria-selected={o === value}
              className="vcl-combobox-option"
              style={optionStyle?.(o)}
              onClick={() => commit(o)}
            >
              {renderOption ? renderOption(o) : o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
