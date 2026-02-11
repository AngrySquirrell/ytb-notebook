use tauri::command;
use serde_json::json;
use reqwest::Client;

#[command]
pub async fn get_youtube_captions(video_id: String, token: String) -> Result<serde_json::Value, String> {
    let client = Client::new();
    let url = "https://www.youtube-transcript.io/api/transcripts";

    let payload = json!({
        "ids": [video_id]
    });

    let response = client
        .post(url)
        .header("Authorization", format!("Basic {}", token))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API Error {}: {}", status, error_text));
    }

    let data = response.json::<serde_json::Value>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(data)
}

