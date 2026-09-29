//! Document I/O commands — the native half of `sfx2/source/doc/docfile.ts`
//! (SfxMedium). Bytes are moved as raw IPC payloads, not JSON arrays, so
//! large `.odt` files don't balloon in transit.

use std::path::{Path, PathBuf};

use percent_encoding::percent_decode_str;
use tauri::ipc::{InvokeBody, Request, Response};

/// Header carrying the (URI-encoded) target path for `write_document`, whose
/// body is the raw file contents.
const PATH_HEADER: &str = "x-document-path";

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Invalid(String),
}

impl serde::Serialize for Error {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

#[tauri::command]
pub async fn read_document(path: String) -> Result<Response, Error> {
    Ok(Response::new(std::fs::read(path)?))
}

#[tauri::command]
pub async fn write_document(request: Request<'_>) -> Result<(), Error> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(Error::Invalid("expected a raw byte payload".into()));
    };
    let encoded = request
        .headers()
        .get(PATH_HEADER)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| Error::Invalid(format!("missing {PATH_HEADER} header")))?;
    let path = PathBuf::from(
        percent_decode_str(encoded)
            .decode_utf8()
            .map_err(|e| Error::Invalid(e.to_string()))?
            .into_owned(),
    );

    // Write next to the target and rename over it, so a failed save never
    // leaves a truncated document behind.
    let file_name = path
        .file_name()
        .ok_or_else(|| Error::Invalid("path has no file name".into()))?;
    let mut tmp_name = std::ffi::OsString::from(".~lock.");
    tmp_name.push(file_name);
    let tmp = path.with_file_name(tmp_name);
    std::fs::write(&tmp, bytes)?;
    std::fs::rename(&tmp, &path).inspect_err(|_| {
        let _ = std::fs::remove_file(&tmp);
    })?;
    Ok(())
}

/// The document passed on the command line (`libreoffice-js foo.odt`), if any.
#[tauri::command]
pub fn startup_document() -> Option<String> {
    std::env::args()
        .skip(1)
        .find(|arg| !arg.starts_with('-') && Path::new(arg).is_file())
}
