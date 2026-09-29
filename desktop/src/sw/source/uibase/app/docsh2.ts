/**
 * SwDocShell document lifecycle — New/Open/Save/Save As/Export and the
 * "Save changes?" query (sw/source/uibase/app/docsh2.cxx together with
 * sfx2's SfxObjectShell::ExecFile_Impl / PrepareClose in objserv.cxx).
 */
import {
  DEFAULT_FILTER,
  filterForPath,
  WRITER_FILTERS,
  type SfxFilter,
} from "../../../../filter/source/config/fragments/filters";
import type { SfxShell } from "../../../../sfx2/source/control/dispatch";
import {
  baseName,
  pickAndRead,
  pickSavePath,
  readFile,
  writeFile,
} from "../../../../sfx2/source/doc/docfile";
import { createDoc } from "../../core/doc/docnew";
import type { SwWrtShell } from "../wrtsh/wrtsh";
import { convertFrom, convertTo, isAlienFormat } from "./docsh";

export interface SwDocInfo {
  readonly path: string | null;
  readonly title: string;
  readonly filter: SfxFilter;
}

/** UI callbacks the shell needs (weld::MessageDialog upstream). */
export interface SfxInteraction {
  query(
    message: string,
    secondary: string,
    buttons: { id: string; label: string; default?: boolean }[],
  ): Promise<string>;
  error(message: string): void;
}

let untitledCount = 0;
const untitled = () => `Untitled ${++untitledCount}`;
const stripExt = (name: string) => name.replace(/\.[^.]+$/, "");

export class SwDocShell {
  private info: SwDocInfo = { path: null, title: untitled(), filter: DEFAULT_FILTER };
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly wrtShell: SwWrtShell,
    private readonly ui: SfxInteraction,
  ) {}

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getInfo = (): SwDocInfo => this.info;

  private setInfo(info: SwDocInfo): void {
    this.info = info;
    for (const l of this.listeners) l();
  }

  /** SfxObjectShell::PrepareClose — true if it is fine to discard the document. */
  async prepareClose(): Promise<boolean> {
    if (!this.wrtShell.getSnapshot().modified) return true;
    const answer = await this.ui.query(
      `Save changes to document "${this.info.title}" before closing?`,
      "Your changes will be lost if you don't save them.",
      [
        { id: "discard", label: "Don't Save" },
        { id: "cancel", label: "Cancel" },
        { id: "save", label: "Save", default: true },
      ],
    );
    if (answer === "save") return this.save();
    return answer === "discard";
  }

  async newDoc(): Promise<void> {
    if (!(await this.prepareClose())) return;
    this.wrtShell.load(createDoc());
    this.setInfo({ path: null, title: untitled(), filter: DEFAULT_FILTER });
  }

  async open(): Promise<void> {
    if (!(await this.prepareClose())) return;
    const file = await pickAndRead(WRITER_FILTERS.filter((f) => f.import));
    if (file) this.load(file.path, file.bytes);
  }

  async openPath(path: string): Promise<void> {
    try {
      this.load(path, await readFile(path));
    } catch (e) {
      this.ui.error(`Could not read "${baseName(path)}": ${e}`);
    }
  }

  private load(path: string, bytes: Uint8Array): void {
    try {
      const { doc, filter } = convertFrom(path, bytes);
      this.wrtShell.load(doc);
      this.setInfo({ path, title: baseName(path), filter });
    } catch (e) {
      this.ui.error(`General input/output error while loading "${baseName(path)}".\n${e}`);
    }
  }

  /** File > Save. Returns false if the document was not saved. */
  async save(): Promise<boolean> {
    const { path, filter } = this.info;
    if (!path || !filter.export) return this.saveAs();
    if (isAlienFormat(filter)) {
      const answer = await this.ui.query(
        `Use ${filter.uiName} Format?`,
        "This document may contain formatting or content that cannot be saved in the currently selected file format.",
        [
          { id: "keep", label: `Use ${filter.uiName} Format!` },
          { id: "odf", label: "Use ODF Format!", default: true },
        ],
      );
      if (answer === "odf") return this.saveAs(DEFAULT_FILTER);
    }
    return this.store(path, filter, true);
  }

  /** File > Save As (or Export when `keepIdentity` is false). */
  async saveAs(preferred?: SfxFilter, keepIdentity = true): Promise<boolean> {
    const filter = preferred ?? (this.info.filter.export ? this.info.filter : DEFAULT_FILTER);
    const name = `${stripExt(this.info.title)}.${filter.extensions[0]}`;
    const exportable = WRITER_FILTERS.filter((f) => f.export);
    const choices = preferred ? [preferred] : [filter, ...exportable.filter((f) => f !== filter)];
    const path = await pickSavePath(name, choices);
    if (!path) return false;
    const chosen = filterForPath(path) ?? filter;
    return this.store(path, chosen.export ? chosen : filter, keepIdentity);
  }

  async exportAs(filterName: string): Promise<boolean> {
    const filter = WRITER_FILTERS.find((f) => f.name === filterName);
    return filter ? this.saveAs(filter, false) : false;
  }

  private async store(path: string, filter: SfxFilter, keepIdentity: boolean): Promise<boolean> {
    try {
      const bytes = convertTo(this.wrtShell.doc, filter, stripExt(this.info.title));
      await writeFile(path, bytes, filter.mimeType);
    } catch (e) {
      this.ui.error(`Error saving the document "${baseName(path)}":\n${e}`);
      return false;
    }
    if (keepIdentity) {
      this.wrtShell.setModified(false);
      this.setInfo({ path, title: baseName(path), filter });
    }
    return true;
  }
}

/** Slots of the document shell (SID_SAVEDOC, SID_SAVEASDOC, …). */
export function createDocShellSlots(docShell: SwDocShell, wrtShell: SwWrtShell): SfxShell {
  return {
    name: "SwDocShell",
    slots: {
      ".uno:Save": {
        exec: () => docShell.save(),
        state: () => ({ enabled: wrtShell.getSnapshot().modified || !docShell.getInfo().path }),
      },
      ".uno:SaveAs": { exec: () => docShell.saveAs() },
      ".uno:ExportToHTML": { exec: () => docShell.exportAs("HTML (StarWriter)") },
      ".uno:ExportToText": { exec: () => docShell.exportAs("Text") },
      ".uno:CloseDoc": { exec: () => docShell.newDoc() },
    },
  };
}
