use tauri::command;
use serde_json::{json, Value};
use reqwest::Client;
use regex::Regex;
use ytt::YouTubeTranscript;

#[command]
pub async fn get_youtube_captions(video_id: String) -> Result<serde_json::Value, String> {
    let api = YouTubeTranscript::new();
    let languages = vec!["en", "fr"];
    
    let transcript_res = api.fetch_transcript(&video_id, Some(languages))
        .await
        .map_err(|e| e.to_string())?;

    let items: Vec<Value> = transcript_res.transcript.into_iter().map(|item| {
        json!({
            "text": item.text, 
            "start": item.start, 
            "duration": item.duration
        })
    }).collect();

    Ok(json!(items))
}

#[command]
pub async fn get_youtube_videodata(url: String) -> Result<serde_json::Value, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.get(&url)
        .header("Accept-Language", "en-US,en;q=0.9,fr;q=0.8")
        .send().await.map_err(|e| e.to_string())?;
    let html = res.text().await.map_err(|e| e.to_string())?;

    // Extract ytInitialPlayerResponse for video details
    let re_player = Regex::new(r"var ytInitialPlayerResponse\s*=\s*(\{.+?\});").map_err(|e| e.to_string())?;
    
    // Extract ytInitialData for social/channel details
    let re_data = Regex::new(r"var ytInitialData\s*=\s*(\{.+?\});").map_err(|e| e.to_string())?;

    let player_json: Option<Value> = re_player.captures(&html)
        .and_then(|caps| caps.get(1))
        .and_then(|m| serde_json::from_str(m.as_str()).ok());
        
    let initial_data: Option<Value> = re_data.captures(&html)
        .and_then(|caps| caps.get(1))
        .and_then(|m| serde_json::from_str(m.as_str()).ok());

    if player_json.is_none() && initial_data.is_none() {
        return Err("Failed to extract YouTube data".to_string());
    }

    let mut result = json!({});

    // Process Player Response (Video Details)
    if let Some(player) = player_json {
        if let Some(details) = player.get("videoDetails") {
            result["title"] = details.get("title").cloned().unwrap_or(json!(""));
            result["description"] = details.get("shortDescription").cloned().unwrap_or(json!(""));
            result["duration"] = details.get("lengthSeconds").cloned().unwrap_or(json!("0"));
            result["viewCount"] = details.get("viewCount").cloned().unwrap_or(json!("0"));
            result["videoId"] = details.get("videoId").cloned().unwrap_or(json!(""));
            
            // Get highest quality thumbnail
            if let Some(thumbs) = details.get("thumbnail").and_then(|t| t.get("thumbnails")).and_then(|t| t.as_array()) {
                if let Some(last) = thumbs.last() {
                     result["thumbnail"] = last.get("url").cloned().unwrap_or(json!(""));
                }
            }
        }
        
        // Microformat for publish date
         if let Some(micro) = player.get("microformat").and_then(|m| m.get("playerMicroformatRenderer")) {
            result["publishDate"] = micro.get("publishDate").cloned().unwrap_or(json!(""));
         }
    }

    // Process Initial Data (Channel Info & Social)
    if let Some(data) = initial_data {
         let contents = data.pointer("/contents/twoColumnWatchNextResults/results/results/contents");
         
         if let Some(contents_arr) = contents.and_then(|c| c.as_array()) {
             // Try to find videoSecondaryInfoRenderer (usually index 1)
             for item in contents_arr {
                 if let Some(secondary) = item.get("videoSecondaryInfoRenderer") {
                     if let Some(owner) = secondary.pointer("/owner/videoOwnerRenderer") {
                         // Channel Name
                         result["channelName"] = owner.pointer("/title/runs/0/text").cloned().unwrap_or(json!(""));
                         
                         // Channel Url
                         result["channelUrl"] = owner.pointer("/navigationEndpoint/commandMetadata/webCommandMetadata/url").cloned().unwrap_or(json!(""));

                         // Channel Avatar
                         if let Some(thumbs) = owner.pointer("/thumbnail/thumbnails").and_then(|t| t.as_array()) {
                            if let Some(last) = thumbs.last() {
                                result["channelAvatar"] = last.get("url").cloned().unwrap_or(json!(""));
                            }
                         }

                         // Subscriber Count
                         result["subscriberCount"] = owner.pointer("/subscriberCountText/simpleText").cloned().unwrap_or(json!(""));
                         
                         // Verified Status
                         let is_verified = owner.get("badges")
                            .and_then(|b| b.as_array())
                            .map(|badges| badges.iter().any(|b| {
                                b.pointer("/metadataBadgeRenderer/style")
                                    .and_then(|s| s.as_str())
                                    .map(|s| s.contains("VERIFIED"))
                                    .unwrap_or(false)
                            }))
                            .unwrap_or(false);
                         result["isVerified"] = json!(is_verified);
                     }
                 }
                 
                 // Try to find videoPrimaryInfoRenderer (usually index 0) for likes
                 if let Some(primary) = item.get("videoPrimaryInfoRenderer") {
                     // Likes are tricky, they move around. 
                     // Try finding segmentedLikeDislikeButtonRenderer
                    let like_text = primary.pointer("/videoActions/menuRenderer/topLevelButtons/0/segmentedLikeDislikeButtonRenderer/likeButton/toggleButtonRenderer/defaultText/simpleText")
                        .or_else(|| primary.pointer("/videoActions/menuRenderer/topLevelButtons/0/toggleButtonRenderer/defaultText/simpleText")); // Older layout
                        
                     if let Some(likes) = like_text {
                         result["likesAmount"] = likes.clone();
                     }
                     
                     // Fallback for publish date format if microformat failed
                     if result["publishDate"] == json!("") {
                        result["publishDate"] = primary.pointer("/dateText/simpleText").cloned().unwrap_or(json!(""));
                     }
                 }
             }
         }
    }

    Ok(result)
}

