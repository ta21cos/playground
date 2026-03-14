mod session;

use session::{ClaudeSession, focus_iterm2_session};

#[tauri::command]
fn get_sessions() -> Vec<ClaudeSession> {
    session::collect_sessions()
}

#[tauri::command]
fn focus_session(session_id: &str) -> Result<String, String> {
    let sessions = session::collect_sessions();
    let session = sessions
        .iter()
        .find(|s| s.session_id == session_id)
        .ok_or_else(|| "Session not found".to_string())?;

    focus_iterm2_session(session)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_sessions, focus_session])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
