use crate::models::http::*;
use anyhow::{anyhow, Result};
use reqwest::{Client, Method, RequestBuilder};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use chrono::Utc;

#[derive(Clone)]
pub struct HttpService {
    client: Client,
}

impl HttpService {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(60)) // Default 60s timeout
            .user_agent("Postgirl/0.1.0")
            .build()
            .expect("Failed to create HTTP client");

        Self { client }
    }

    pub async fn execute_request(
        &self,
        request: HttpRequest,
        environment_variables: Option<HashMap<String, String>>,
    ) -> Result<HttpResponse> {
        let start_time = Instant::now();
        
        // Substitute environment variables in URL
        let url = self.substitute_variables(&request.url, &environment_variables);
        
        // Convert HttpMethod to reqwest::Method
        let method = self.convert_method(&request.method)?;
        
        // Create the request builder
        let mut req_builder = self.client.request(method, &url);
        
        // Add headers with variable substitution
        for (key, value) in &request.headers {
            let substituted_value = self.substitute_variables(value, &environment_variables);
            req_builder = req_builder.header(key, substituted_value);
        }
        
        // Add request body if present
        req_builder = self.add_request_body(req_builder, &request.body, &environment_variables)?;
        
        // Set timeout if specified
        if let Some(timeout_ms) = request.timeout_ms {
            req_builder = req_builder.timeout(Duration::from_millis(timeout_ms));
        }
        
        // Execute the request
        let response = req_builder.send().await.map_err(|e| {
            anyhow!("Request failed: {}", e)
        })?;
        
        let end_time = Instant::now();
        let total_time_ms = end_time.duration_since(start_time).as_millis() as u64;
        
        // Process response
        self.process_response(response, request.id, total_time_ms).await
    }

    fn substitute_variables(
        &self,
        text: &str,
        variables: &Option<HashMap<String, String>>,
    ) -> String {
        if let Some(vars) = variables {
            let mut result = text.to_string();
            for (key, value) in vars {
                let placeholder = format!("{{{{{}}}}}", key);
                result = result.replace(&placeholder, value);
            }
            result
        } else {
            text.to_string()
        }
    }

    fn convert_method(&self, method: &HttpMethod) -> Result<Method> {
        match method {
            HttpMethod::Get => Ok(Method::GET),
            HttpMethod::Post => Ok(Method::POST),
            HttpMethod::Put => Ok(Method::PUT),
            HttpMethod::Delete => Ok(Method::DELETE),
            HttpMethod::Patch => Ok(Method::PATCH),
            HttpMethod::Head => Ok(Method::HEAD),
            HttpMethod::Options => Ok(Method::OPTIONS),
        }
    }

    fn add_request_body(
        &self,
        mut req_builder: RequestBuilder,
        body: &Option<RequestBody>,
        environment_variables: &Option<HashMap<String, String>>,
    ) -> Result<RequestBuilder> {
        if let Some(body) = body {
            match body {
                RequestBody::None => {},
                RequestBody::Raw { content, content_type } => {
                    let substituted_content = self.substitute_variables(content, environment_variables);
                    req_builder = req_builder
                        .header("Content-Type", content_type)
                        .body(substituted_content);
                },
                RequestBody::Json { data } => {
                    // For JSON, we need to substitute variables in the serialized string
                    let json_str = serde_json::to_string(data)?;
                    let substituted_json = self.substitute_variables(&json_str, environment_variables);
                    let substituted_data: serde_json::Value = serde_json::from_str(&substituted_json)?;
                    req_builder = req_builder.json(&substituted_data);
                },
                RequestBody::FormData { fields } => {
                    let mut form = reqwest::multipart::Form::new();
                    for (key, value) in fields {
                        let substituted_value = self.substitute_variables(value, environment_variables);
                        form = form.text(key.clone(), substituted_value);
                    }
                    req_builder = req_builder.multipart(form);
                },
                RequestBody::FormUrlEncoded { fields } => {
                    let mut params = Vec::new();
                    for (key, value) in fields {
                        let substituted_value = self.substitute_variables(value, environment_variables);
                        params.push((key.clone(), substituted_value));
                    }
                    req_builder = req_builder.form(&params);
                },
                RequestBody::Binary { data, content_type } => {
                    req_builder = req_builder
                        .header("Content-Type", content_type)
                        .body(data.clone());
                },
            }
        }
        Ok(req_builder)
    }

    async fn process_response(
        &self,
        response: reqwest::Response,
        request_id: String,
        total_time_ms: u64,
    ) -> Result<HttpResponse> {
        let status = response.status().as_u16();
        let status_text = response.status().canonical_reason()
            .unwrap_or("Unknown")
            .to_string();

        // Extract headers
        let mut headers = HashMap::new();
        for (name, value) in response.headers().iter() {
            if let Ok(value_str) = value.to_str() {
                headers.insert(name.to_string(), value_str.to_string());
            }
        }

        // Determine content type
        let content_type = response.headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("text/plain")
            .to_lowercase();

        // Process response body
        let body = if content_type.contains("application/json") {
            let text = response.text().await?;
            if text.is_empty() {
                ResponseBody::Empty
            } else {
                match serde_json::from_str::<serde_json::Value>(&text) {
                    Ok(json) => ResponseBody::Json { data: json },
                    Err(_) => ResponseBody::Text { content: text },
                }
            }
        } else if content_type.starts_with("text/") 
            || content_type.contains("application/xml")
            || content_type.contains("application/html") {
            let text = response.text().await?;
            if text.is_empty() {
                ResponseBody::Empty
            } else {
                ResponseBody::Text { content: text }
            }
        } else {
            let bytes = response.bytes().await?;
            if bytes.is_empty() {
                ResponseBody::Empty
            } else {
                let size = bytes.len();
                ResponseBody::Binary { 
                    data: bytes.to_vec(), 
                    size 
                }
            }
        };

        let timing = ResponseTiming {
            total_time_ms,
            dns_lookup_ms: None, // reqwest doesn't provide detailed timing
            tcp_connect_ms: None,
            tls_handshake_ms: None,
            first_byte_ms: None,
            download_ms: None,
        };

        Ok(HttpResponse {
            status,
            status_text,
            headers,
            body,
            timing,
            request_id,
            timestamp: Utc::now(),
        })
    }

    pub fn create_error(
        &self,
        error_type: HttpErrorType,
        message: String,
        details: Option<String>,
    ) -> HttpError {
        HttpError {
            error_type,
            message,
            details,
            timestamp: Utc::now(),
        }
    }

    pub async fn test_connection(&self, url: &str) -> Result<bool> {
        match self.client.head(url).send().await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub fn get_supported_methods(&self) -> Vec<HttpMethod> {
        vec![
            HttpMethod::Get,
            HttpMethod::Post,
            HttpMethod::Put,
            HttpMethod::Delete,
            HttpMethod::Patch,
            HttpMethod::Head,
            HttpMethod::Options,
        ]
    }
}

impl Default for HttpService {
    fn default() -> Self {
        Self::new()
    }
}