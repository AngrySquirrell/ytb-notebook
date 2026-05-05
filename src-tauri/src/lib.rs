// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod extract_youtube;
mod llm;

use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    let mut builder = tauri::Builder::<tauri::Wry>::new();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
            // when defining deep link schemes at runtime, you must also check `argv` here
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_google_auth::init())
        .plugin(tauri_plugin_velesdb::init_with_path("../velesdb"))
        .setup(|app| {
            #[cfg(desktop)]
            {
                let _ = app.deep_link().register_all();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            extract_youtube::get_youtube_captions,
            extract_youtube::get_youtube_videodata,
            extract_youtube::get_available_youtube_captions_list,
            llm::generate_context_chunks,
            llm::generate_embedding,
            llm::generate_chatbot_answer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
