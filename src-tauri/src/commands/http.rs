use crate::models::http::*;
use crate::services::http_service::HttpService;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::State;

type HttpServiceState = Arc<Mutex<HttpService>>;

// Macro to get cloned service to avoid holding lock across await
macro_rules! get_http_service {
    ($service_state:expr) => {{
        let service_state = $service_state.lock().map_err(|e| format!("HTTP service lock error: {}", e))?;
        service_state.clone()
    }};
}

#[tauri::command]
pub async fn execute_http_request(
    request: HttpRequest,
    environment_variables: Option<HashMap<String, String>>,
    http_service: State<'_, HttpServiceState>,
) -> Result<ExecuteRequestResponse, String> {
    let service = get_http_service!(http_service);
    let request_id = request.id.clone();
    
    match service.execute_request(request, environment_variables).await {
        Ok(response) => Ok(ExecuteRequestResponse {
            response: Some(response),
            error: None,
            request_id,
        }),
        Err(e) => {
            let error = service.create_error(
                HttpErrorType::UnknownError,
                e.to_string(),
                Some(format!("Request execution failed: {}", e)),
            );
            Ok(ExecuteRequestResponse {
                response: None,
                error: Some(error),
                request_id,
            })
        }
    }
}

#[tauri::command]
pub async fn test_http_connection(
    url: String,
    http_service: State<'_, HttpServiceState>,
) -> Result<bool, String> {
    let service = get_http_service!(http_service);
    service.test_connection(&url).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_supported_http_methods(
    http_service: State<'_, HttpServiceState>,
) -> Result<Vec<HttpMethod>, String> {
    let service = get_http_service!(http_service);
    Ok(service.get_supported_methods())
}

#[tauri::command]
pub async fn create_default_http_request() -> Result<HttpRequest, String> {
    Ok(HttpRequest::default())
}

#[tauri::command]
pub async fn validate_http_url(url: String) -> Result<bool, String> {
    match url::Url::parse(&url) {
        Ok(parsed_url) => {
            // Check if it's HTTP or HTTPS
            let scheme = parsed_url.scheme();
            Ok(scheme == "http" || scheme == "https")
        },
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn parse_curl_command(curl_command: String) -> Result<HttpRequest, String> {
    // Basic curl parsing - this is a simplified implementation
    // In production, you'd want a more robust curl parser
    
    let mut request = HttpRequest::default();
    let parts: Vec<&str> = curl_command.split_whitespace().collect();
    
    let mut i = 0;
    while i < parts.len() {
        match parts[i] {
            "curl" => {}, // Skip curl command
            "-X" | "--request" => {
                if i + 1 < parts.len() {
                    request.method = HttpMethod::from(parts[i + 1]);
                    i += 1;
                }
            },
            "-H" | "--header" => {
                if i + 1 < parts.len() {
                    let header = parts[i + 1];
                    if let Some((key, value)) = header.split_once(':') {
                        request.headers.insert(
                            key.trim().to_string(),
                            value.trim().to_string(),
                        );
                    }
                    i += 1;
                }
            },
            "-d" | "--data" => {
                if i + 1 < parts.len() {
                    let data = parts[i + 1];
                    // Try to parse as JSON, fallback to raw
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        request.body = Some(RequestBody::Json { data: json });
                    } else {
                        request.body = Some(RequestBody::Raw {
                            content: data.to_string(),
                            content_type: "text/plain".to_string(),
                        });
                    }
                    i += 1;
                }
            },
            url if url.starts_with("http") => {
                request.url = url.to_string();
            },
            _ => {}, // Skip unknown options
        }
        i += 1;
    }
    
    Ok(request)
}

// Helper function to format response for debugging
#[tauri::command]
pub async fn format_http_response_debug(response: HttpResponse) -> Result<String, String> {
    let mut debug_info = String::new();
    
    debug_info.push_str(&format!("Status: {} {}\n", response.status, response.status_text));
    debug_info.push_str(&format!("Time: {}ms\n", response.timing.total_time_ms));
    debug_info.push_str("\nHeaders:\n");
    
    for (key, value) in &response.headers {
        debug_info.push_str(&format!("{}: {}\n", key, value));
    }
    
    debug_info.push_str("\nBody:\n");
    match &response.body {
        ResponseBody::Text { content } => {
            debug_info.push_str(content);
        },
        ResponseBody::Json { data } => {
            if let Ok(pretty) = serde_json::to_string_pretty(data) {
                debug_info.push_str(&pretty);
            } else {
                debug_info.push_str(&data.to_string());
            }
        },
        ResponseBody::Binary { size, .. } => {
            debug_info.push_str(&format!("Binary data ({} bytes)", size));
        },
        ResponseBody::Empty => {
            debug_info.push_str("(empty)");
        },
    }
    
    Ok(debug_info)
}