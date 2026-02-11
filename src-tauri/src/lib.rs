// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod extract_youtube;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_google_auth::init())
        .plugin(tauri_plugin_velesdb::init())
        .invoke_handler(tauri::generate_handler![greet, extract_youtube::get_youtube_captions])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
