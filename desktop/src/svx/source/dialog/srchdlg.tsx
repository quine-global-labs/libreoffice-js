/**
 * Find & Replace — counterpart of svx/source/dialog/srchdlg.cxx
 * (SvxSearchDialog). Modeless: the dialog only collects the search item and
 * hands it to the view (`onSearch`), which does the searching, like
 * SID_SEARCH_ITEM being executed by SwView upstream.
 */
import { useState } from "react";
import { Dialog } from "../../../vcl/source/window/dialog";

export type SvxSearchCmd = "find" | "findPrevious" | "replace" | "replaceAll";

export interface SvxSearchItem {
  command: SvxSearchCmd;
  searchString: string;
  replaceString: string;
  matchCase: boolean;
  wholeWords: boolean;
}

export function SvxSearchDialog({
  initialSearch,
  onSearch,
  onClose,
}: {
  initialSearch: string;
  /** Executes the search; returns a status message for the dialog. */
  onSearch: (item: SvxSearchItem) => string;
  onClose: () => void;
}) {
  const [searchString, setSearch] = useState(initialSearch);
  const [replaceString, setReplace] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWords, setWholeWords] = useState(false);
  const [status, setStatus] = useState("");

  const run = (command: SvxSearchCmd) =>
    setStatus(onSearch({ command, searchString, replaceString, matchCase, wholeWords }));

  const disabled = !searchString;
  return (
    <Dialog
      title="Find and Replace"
      width={440}
      onClose={onClose}
      buttons={
        <>
          <button className="vcl-button" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="svx-search-grid">
        <label htmlFor="svx-search">Find:</label>
        <input
          id="svx-search"
          className="vcl-field"
          autoFocus
          value={searchString}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) run(e.shiftKey ? "findPrevious" : "find");
          }}
        />
        <label htmlFor="svx-replace">Replace:</label>
        <input
          id="svx-replace"
          className="vcl-field"
          value={replaceString}
          onChange={(e) => setReplace(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) run("replace");
          }}
        />
      </div>
      <div className="svx-search-options">
        <label className="vcl-checkbox">
          <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
          Match case
        </label>
        <label className="vcl-checkbox">
          <input type="checkbox" checked={wholeWords} onChange={(e) => setWholeWords(e.target.checked)} />
          Whole words only
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <button className="vcl-button" disabled={disabled} onClick={() => run("findPrevious")}>
          Find Previous
        </button>
        <button className="vcl-button" data-default="" disabled={disabled} onClick={() => run("find")}>
          Find Next
        </button>
        <button className="vcl-button" disabled={disabled} onClick={() => run("replace")}>
          Replace
        </button>
        <button className="vcl-button" disabled={disabled} onClick={() => run("replaceAll")}>
          Replace All
        </button>
      </div>
      <div className="svx-search-status" role="status">
        {status}
      </div>
    </Dialog>
  );
}
