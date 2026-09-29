/**
 * SfxMedium — where document bytes come from and go to
 * (sfx2/source/doc/docfile.cxx). Inside Tauri files go through the native
 * `read_document` / `write_document` commands (src-tauri/src/document.rs)
 * and the native file dialogs; in a plain browser (`npm run dev`) it falls
 * back to an <input type=file> and a download.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { SfxFilter } from "../../../filter/source/config/fragments/filters";

export interface SfxMediumFile {
  /** Native path, or just the file name in the browser. */
  path: string;
  bytes: Uint8Array;
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function dialogFilters(filters: readonly SfxFilter[]) {
  const all = filters.flatMap((f) => f.extensions);
  return [
    { name: "All Formats", extensions: all },
    ...filters.map((f) => ({ name: f.uiName, extensions: [...f.extensions] })),
  ];
}

function browserPick(filters: readonly SfxFilter[]): Promise<SfxMediumFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(",");
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      resolve(file ? { path: file.name, bytes: new Uint8Array(await file.arrayBuffer()) } : null);
    });
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

/** File > Open: asks for a file and reads it. */
export async function pickAndRead(filters: readonly SfxFilter[]): Promise<SfxMediumFile | null> {
  if (!isTauri()) return browserPick(filters);
  const path = await open({ multiple: false, directory: false, filters: dialogFilters(filters) });
  return path ? { path, bytes: await readFile(path) } : null;
}

export async function readFile(path: string): Promise<Uint8Array> {
  return new Uint8Array(await invoke<ArrayBuffer>("read_document", { path }));
}

/** File > Save As: asks where to save. */
export async function pickSavePath(
  defaultName: string,
  filters: readonly SfxFilter[],
): Promise<string | null> {
  if (!isTauri()) return defaultName;
  return save({ defaultPath: defaultName, filters: filters.map((f) => ({ name: f.uiName, extensions: [...f.extensions] })) });
}

export async function writeFile(path: string, bytes: Uint8Array, mimeType: string): Promise<void> {
  if (isTauri()) {
    await invoke("write_document", bytes, {
      headers: { "x-document-path": encodeURIComponent(path) },
    });
    return;
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = baseName(path);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The document passed on the command line, if any. */
export async function startupDocument(): Promise<string | null> {
  return isTauri() ? invoke<string | null>("startup_document") : null;
}
