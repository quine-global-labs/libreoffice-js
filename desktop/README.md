# LibreOffice JS desktop app

Tauri 2 shell (`src-tauri/`) around a React + Vite frontend (`src/`).

```sh
npm install
npx tauri dev        # desktop window, hot reload (runs `npm run dev` itself)
npm run dev          # browser only: http://localhost:1420 (downloads instead of saving)
npm test             # vitest: src/**/qa/**/*.test.ts
npm run typecheck
npx tauri build      # bundle → src-tauri/target/release/bundle/
```

The Rust side (`src-tauri/src/document.rs`) exposes `read_document`,
`write_document` (raw byte IPC, atomic write) and `startup_document` (a file
path passed on the command line). Everything else lives in the frontend; see
the root README for the module layout.
