//! Native shell for LibreOffice JS.
//!
//! The document model, layout and UI all live in the React frontend
//! (`desktop/src`, organised like LibreOffice's modules). The Rust side only
//! provides what a webview can't: file-system access for the document
//! filters (see `document.rs`), native dialogs, and window lifecycle.

mod document;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            document::read_document,
            document::write_document,
            document::startup_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LibreOffice JS");
}
