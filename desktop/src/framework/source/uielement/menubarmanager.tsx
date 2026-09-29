/**
 * MenuBarManager — builds menus from uiconfig menubar/popupmenu XML and binds
 * each entry to its UNO command (framework/source/uielement/menubarmanager.cxx
 * + framework/source/fwe/xml/menudocumenthandler.cxx). Labels come from
 * officecfg, state from the dispatcher.
 */
import { commandLabel } from "../../../officecfg/registry/data/org/openoffice/Office/UI/GenericCommands";
import { shortcutFor } from "../../../officecfg/registry/data/org/openoffice/Office/Accelerators";
import { useDispatcher, type SfxDispatcher } from "../../../sfx2/source/control/dispatch";
import { CommandImage } from "../../../vcl/source/image/ImplImageTree";
import { MenuBar, PopupMenu, type VclMenuEntry } from "../../../vcl/source/window/menu";

export type MenuConfigEntry =
  | { kind: "separator" }
  | { kind: "item"; command: string }
  | { kind: "menu"; command: string; children: MenuConfigEntry[] };

function parseEntries(parent: Element): MenuConfigEntry[] {
  const out: MenuConfigEntry[] = [];
  for (const el of Array.from(parent.children)) {
    const command = el.getAttribute("menu:id") ?? "";
    if (el.localName === "menuseparator") out.push({ kind: "separator" });
    else if (el.localName === "menuitem") out.push({ kind: "item", command });
    else if (el.localName === "menu") {
      const popup = Array.from(el.children).find((c) => c.localName === "menupopup");
      out.push({ kind: "menu", command, children: popup ? parseEntries(popup) : [] });
    }
  }
  return out;
}

/** Parses a menu:menubar or menu:menupopup document. */
export function parseMenuXml(xml: string): MenuConfigEntry[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return parseEntries(doc.documentElement);
}

function resolve(entries: MenuConfigEntry[], dispatcher: SfxDispatcher): VclMenuEntry[] {
  return entries.map((e): VclMenuEntry => {
    if (e.kind === "separator") return { kind: "separator" };
    if (e.kind === "menu") {
      const submenu = resolve(e.children, dispatcher);
      return {
        kind: "item",
        id: e.command,
        label: commandLabel(e.command),
        enabled: submenu.some((s) => s.kind === "item" && s.enabled),
        submenu,
      };
    }
    const state = dispatcher.queryState(e.command);
    return {
      kind: "item",
      id: e.command,
      label: commandLabel(e.command),
      shortcut: shortcutFor(e.command),
      icon: <CommandImage command={e.command} size={14} />,
      enabled: state.enabled,
      checked: state.checked,
    };
  });
}

export function MenuBarManager({ config }: { config: MenuConfigEntry[] }) {
  const dispatcher = useDispatcher();
  const menus = config.flatMap((m) =>
    m.kind === "menu"
      ? [{ id: m.command, label: commandLabel(m.command), entries: () => resolve(m.children, dispatcher) }]
      : [],
  );
  return <MenuBar menus={menus} onSelect={(cmd) => dispatcher.execute(cmd)} />;
}

export function ContextMenuManager({
  config,
  x,
  y,
  onClose,
}: {
  config: MenuConfigEntry[];
  x: number;
  y: number;
  onClose: () => void;
}) {
  const dispatcher = useDispatcher();
  return (
    <PopupMenu
      entries={resolve(config, dispatcher)}
      x={x}
      y={y}
      onClose={onClose}
      onSelect={(cmd) => dispatcher.execute(cmd)}
    />
  );
}
