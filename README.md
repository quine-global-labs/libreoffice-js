<img src="desktop/src-tauri/icons/128x128@2x.png" alt="LibreOffice JS logo" align="right" height="96" />

# LibreOffice JS

A [Tauri](https://tauri.app) + React word processor modelled on
[LibreOffice](https://www.libreoffice.org) Writer. The frontend is organised
like LibreOffice's `core` repository — the same module names (`sw`, `sfx2`,
`framework`, `vcl`, `svx`, `editeng`, …) and, where it makes sense, the same
file names — so upstream code can be used as the map for porting features.

> `core/` is a checkout of [LibreOffice/core](https://github.com/LibreOffice/core)
> kept for reference; it is not built. `desktop/` is the app.

## Quick start

```sh
# one-time: Node >= 24 (see .nvmrc), Rust
just run        # Tauri window with hot reload
just web        # frontend only, in a browser at http://localhost:1420
just test       # typecheck + unit tests + cargo check
just bundle     # packaged app under desktop/src-tauri/target/release/bundle/
```

No `just`? The recipes are one-liners in the [Justfile](Justfile).

## What works (skeleton)

- **Editing**: typing, Enter / Shift+Enter, Backspace/Delete (grapheme-aware),
  word/line deletes, IME composition, spell-check replacements, Tab.
- **Undo/redo** with typing grouped into one step.
- **Character formatting**: bold, italic, underline, strikethrough,
  super/subscript, font name/size, font colour, highlighting, clear direct
  formatting. With a collapsed cursor inside a word, formatting applies to
  the word (as in Writer); otherwise to the next typed text.
- **Paragraphs**: alignment, indent, spacing, line spacing, page breaks
  (Ctrl+Enter), bulleted/numbered lists with levels.
- **Paragraph styles**: Default, Body Text, Title, Subtitle, Heading 1–3,
  Quotations, Preformatted Text; "next style" on Enter.
- **Pages**: A4 pages with pagination (whole paragraphs move between pages),
  zoom, ruler, formatting marks, printing.
- **Files**: open/save `.odt` and `.fodt` (readable by LibreOffice), open/save
  `.txt`, export `.html`; "Save changes?" on close.
- **UI**: menu bar, Standard and Formatting toolbars, context menu, sidebar
  (Properties, Styles, Navigator), status bar with word count and zoom,
  Find & Replace, Word Count, keyboard shortcuts from Writer.

Commands that exist in Writer but aren't implemented yet (tables, images,
comments, Character/Paragraph dialogs, …) appear disabled in the menus.

## Repository layout

```
.
├── core/                  # upstream LibreOffice checkout (reference, not built)
├── desktop/               # the app
│   ├── src-tauri/         #   Rust: file I/O commands, dialogs, window lifecycle
│   ├── src/               #   React frontend, laid out like core/:
│   │   ├── desktop/       #     app start-up          (core/desktop)
│   │   ├── sw/            #     Writer                (core/sw)
│   │   │   ├── inc/       #       model types: SwDoc, SwTextNode, SwPaM
│   │   │   ├── source/core/      document model, styles, undo, layout, text frames
│   │   │   ├── source/filter/    ODF (xml), HTML, plain text filters
│   │   │   ├── source/uibase/    SwView, SwEditWin, SwWrtShell, shells, doc shell
│   │   │   ├── source/ui/        dialogs
│   │   │   ├── uiconfig/  #       menubar/toolbar/popup XML (upstream format)
│   │   │   └── qa/        #       unit tests
│   │   ├── sfx2/          #     dispatcher, sidebar, doc medium, app slots
│   │   ├── framework/     #     menu bar / toolbar managers
│   │   ├── vcl/           #     widgets: menus, toolbox, combobox, dialogs
│   │   ├── svx/           #     toolbar controllers, sidebar panels, find dialog
│   │   ├── svtools/       #     ruler
│   │   ├── editeng/       #     character / paragraph attribute items
│   │   ├── officecfg/     #     command labels and accelerators
│   │   ├── filter/        #     filter registry
│   │   ├── unotools/      #     font substitution
│   │   └── cui/           #     About dialog
│   └── scripts/build.sh   #   npm ci + tests + tauri build
└── Justfile
```

## Architecture in one paragraph

`SwDoc` is an immutable value (paragraphs made of attribute runs), so undo is
a snapshot. `SwWrtShell` is the editing API. `SwEditWin` renders pages into a
`contentEditable` host whose DOM is owned by React: every native edit is
cancelled in `beforeinput` and replayed on the model, while the browser still
handles caret movement, selection, IME and spell checking. UI commands are
`.uno:` strings routed by `SfxDispatcher` through a shell stack (text shell →
view → document → application), exactly like upstream; menus and toolbars are
built from the same XML format as `core/sw/uiconfig`.
