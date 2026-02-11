use mistral_api_client::{MistralClient};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CaptionItem {
    pub text: String,
    pub start: f64,
    pub duration: f64,
}

#[derive(Serialize)]
struct EmbeddingRequest {
    model: String,
    input: Vec<String>,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

#[derive(Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
}

const MISTRAL_API_URL: &str = "https://api.mistral.ai/v1";

/// Transform caption items into text chunks for embedding using a Light LLM
/// Aggregates text and asks the LLM to refine it for embedding
#[tauri::command]
pub async fn generate_context_chunks(
    api_token: String,
    captions: Vec<CaptionItem>,
) -> Result<Vec<String>, String> {
    // Mistral Embed has 8192 token context.
    // We group raw text into ~3000 chars (~750 tokens) to allow the light LLM to process it
    // and produce a coherent chunk that fits well within the embedding context.
    let raw_chunk_size = 3000;
    
    let mut raw_chunks = Vec::new();
    let mut current_chunk = String::new();

    for item in captions {
        if current_chunk.len() + item.text.len() > raw_chunk_size && !current_chunk.is_empty() {
            raw_chunks.push(current_chunk.trim().to_string());
            current_chunk.clear();
        }
        current_chunk.push_str(&item.text);
        current_chunk.push(' ');
    }
    if !current_chunk.is_empty() {
        raw_chunks.push(current_chunk.trim().to_string());
    }

    let mut refined_chunks = Vec::new();
    let client = MistralClient::new(&api_token).with_model("mistral-medium");

    for chunk in raw_chunks {
        let system_prompt = "You are an AI optimized for knowledge extraction. \
            Rewrite the following video transcript segment into a detailed, coherent text suitable for embedding space. \
            Preserve all factual details, technical terms, and logical flow. \
            Do not summarize too heavily; aim for clarity and density.";

        // MistralClient generate uses a string prompt as per docs example.
        // We simulate system/user interaction by formatting the prompt.
        let prompt = format!(
            "{}\n\nTranscript Segment:\n{}",
            system_prompt, chunk
        );
        
        // Using generate from mistral_api_client
        let response = client.generate(&prompt).await
            .map_err(|e| format!("Mistral Client error: {}", e))?;

        refined_chunks.push(response);
    }

    Ok(refined_chunks)
}

/// Generate embeddings for a list of text chunks using Mistral API
#[tauri::command]
pub async fn generate_embedding(api_token: String, chunks: Vec<String>) -> Result<Vec<Vec<f32>>, String> {
    let client = Client::new();
    
    // Mistral API call
    let request_body = EmbeddingRequest {
        model: "mistral-embed".to_string(),
        input: chunks,
    };

    let response = client
        .post(format!("{}/embeddings", MISTRAL_API_URL))
        .bearer_auth(api_token)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Mistral API error {}: {}", status, error_text));
    }

    let response_body: EmbeddingResponse = response.json().await.map_err(|e| format!("Parse error: {}", e))?;

    let embeddings: Vec<Vec<f32>> = response_body.data.into_iter().map(|d| d.embedding).collect();
    
    Ok(embeddings)
}

/// Generate a chatbot answer based on the user's question and retrieved context
#[tauri::command]
pub async fn generate_chatbot_answer(
    api_token: String,
    model: String,
    question: String,
    context: String,
) -> Result<String, String> {
    
    let system_prompt = format!(
        "You are a helpful assistant. Use the following context to answer the user's question.\n\
        If the answer is not in the context, say so.\n\n\
        Context:\n{}", 
        context
    );

    let client = MistralClient::new(&api_token).with_model(&model);

    // Using generate from mistral_api_client
    let prompt = format!(
        "{}\n\nUser Question:\n{}",
        system_prompt, question
    );

    let response = client.generate(&prompt).await
        .map_err(|e| format!("Mistral Client error: {}", e))?;

    Ok(response)
}
