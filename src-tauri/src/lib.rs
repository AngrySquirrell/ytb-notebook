// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod extract_youtube;
mod llm;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_google_auth::init())
        // .plugin(tauri_plugin_velesdb::init_with_path("velesdb"))
        .plugin(tauri_plugin_velesdb::init_with_path("../velesdb"))
        .invoke_handler(tauri::generate_handler![ 
            extract_youtube::get_youtube_captions,
            extract_youtube::get_youtube_videodata,
            llm::generate_context_chunks,
            llm::generate_embedding,
            llm::generate_chatbot_answer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
