# LibreOffice JS desktop app

# Run the desktop app (Vite dev server + Tauri window, with hot reload).
run:
    cd desktop && npm install && npx tauri dev

# Run only the frontend in a browser at http://localhost:1420 (no native file I/O).
web:
    cd desktop && npm install && npm run dev

# Type-check and run the unit tests (desktop/src/**/qa).
test:
    cd desktop && npm run typecheck && npm test
    cd desktop/src-tauri && cargo check

# Build the packaged app (desktop/src-tauri/target/release/bundle/).
bundle:
    ./desktop/scripts/build.sh
