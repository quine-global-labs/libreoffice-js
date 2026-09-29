/**
 * ToolBarManager — builds a ToolBox from uiconfig toolbar XML and binds its
 * items to UNO commands (framework/source/uielement/toolbarmanager.cxx).
 * Commands with a registered controller (font boxes, colour pickers — see
 * Controller.xcu upstream) render that controller instead of a button.
 */
import type { ComponentType } from "react";
import { commandLabel } from "../../../officecfg/registry/data/org/openoffice/Office/UI/GenericCommands";
import { shortcutFor } from "../../../officecfg/registry/data/org/openoffice/Office/Accelerators";
import { useDispatcher } from "../../../sfx2/source/control/dispatch";
import { CommandImage, hasCommandImage } from "../../../vcl/source/image/ImplImageTree";
import { ToolBox, ToolBoxButton, ToolBoxSeparator } from "../../../vcl/source/window/toolbox";

export type ToolBarConfigEntry = { kind: "separator" } | { kind: "item"; command: string };

export function parseToolBarXml(xml: string): ToolBarConfigEntry[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.documentElement.children).flatMap((el): ToolBarConfigEntry[] => {
    if (el.localName === "toolbarseparator") return [{ kind: "separator" }];
    if (el.localName === "toolbaritem") {
      const command = el.getAttributeNS("http://www.w3.org/1999/xlink", "href") ?? el.getAttribute("xlink:href");
      return command ? [{ kind: "item", command }] : [];
    }
    return [];
  });
}

export interface ToolBoxControllerProps {
  command: string;
}

/** Toolbar controller factory (framework/source/uifactories/toolbarcontrollerfactory.cxx). */
const controllers = new Map<string, ComponentType<ToolBoxControllerProps>>();

export function registerToolBoxController(
  command: string,
  controller: ComponentType<ToolBoxControllerProps>,
): void {
  controllers.set(command, controller);
}

export function tooltipFor(command: string): string {
  const shortcut = shortcutFor(command);
  return shortcut ? `${commandLabel(command, true)} (${shortcut})` : commandLabel(command, true);
}

/** A plain command button (the generic ToolBox item). */
export function CommandButton({ command }: ToolBoxControllerProps) {
  const dispatcher = useDispatcher();
  const state = dispatcher.queryState(command);
  return (
    <ToolBoxButton
      icon={<CommandImage command={command} />}
      text={hasCommandImage(command) ? undefined : commandLabel(command)}
      tooltip={tooltipFor(command)}
      checked={state.checked}
      disabled={!state.enabled}
      onClick={() => dispatcher.execute(command)}
    />
  );
}

export function ToolBarItems({ entries }: { entries: ToolBarConfigEntry[] }) {
  return (
    <>
      {entries.map((e, i) => {
        if (e.kind === "separator") return <ToolBoxSeparator key={i} />;
        const Controller = controllers.get(e.command) ?? CommandButton;
        return <Controller key={e.command} command={e.command} />;
      })}
    </>
  );
}

export function ToolBarManager({ config, label }: { config: ToolBarConfigEntry[]; label: string }) {
  return (
    <ToolBox label={label}>
      <ToolBarItems entries={config} />
    </ToolBox>
  );
}
