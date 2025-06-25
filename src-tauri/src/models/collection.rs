use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Collection {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub folder_path: Option<String>, // For organizing collections in folders
    pub git_branch: Option<String>,  // Git branch this collection belongs to
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Request {
    pub id: String,
    pub collection_id: String,
    pub name: String,
    pub description: Option<String>,
    pub method: String, // GET, POST, PUT, DELETE, etc.
    pub url: String,
    pub headers: String, // JSON string of headers
    pub body: Option<String>,
    pub body_type: String, // json, form, raw, etc.
    pub auth_type: Option<String>, // bearer, basic, api_key, etc.
    pub auth_config: Option<String>, // JSON string of auth configuration
    pub follow_redirects: bool,
    pub timeout_ms: u32,
    pub order_index: i32, // For ordering within collection
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCollectionRequest {
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub folder_path: Option<String>,
    pub git_branch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCollectionRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub folder_path: Option<String>,
    pub git_branch: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRequestRequest {
    pub collection_id: String,
    pub name: String,
    pub description: Option<String>,
    pub method: String,
    pub url: String,
    pub headers: Option<serde_json::Value>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub auth_type: Option<String>,
    pub auth_config: Option<serde_json::Value>,
    pub follow_redirects: Option<bool>,
    pub timeout_ms: Option<u32>,
    pub order_index: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateRequestRequest {
    pub id: String,
    pub collection_id: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub method: Option<String>,
    pub url: Option<String>,
    pub headers: Option<serde_json::Value>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub auth_type: Option<String>,
    pub auth_config: Option<serde_json::Value>,
    pub follow_redirects: Option<bool>,
    pub timeout_ms: Option<u32>,
    pub order_index: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionSummary {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub folder_path: Option<String>,
    pub git_branch: Option<String>,
    pub is_active: bool,
    pub request_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Collection {
    pub fn new(request: CreateCollectionRequest) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            workspace_id: request.workspace_id,
            name: request.name,
            description: request.description,
            folder_path: request.folder_path,
            git_branch: request.git_branch,
            is_active: false,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update(&mut self, request: UpdateCollectionRequest) {
        if let Some(name) = request.name {
            self.name = name;
        }
        if let Some(description) = request.description {
            self.description = Some(description);
        }
        if let Some(folder_path) = request.folder_path {
            self.folder_path = Some(folder_path);
        }
        if let Some(git_branch) = request.git_branch {
            self.git_branch = Some(git_branch);
        }
        if let Some(is_active) = request.is_active {
            self.is_active = is_active;
        }
        self.updated_at = Utc::now();
    }
}

impl Request {
    pub fn new(request: CreateRequestRequest) -> Self {
        let now = Utc::now();
        
        // Serialize headers and auth_config to JSON strings
        let headers = request.headers
            .map(|h| serde_json::to_string(&h).unwrap_or_default())
            .unwrap_or_default();
            
        let auth_config = request.auth_config
            .map(|a| serde_json::to_string(&a).unwrap_or_default());

        Self {
            id: Uuid::new_v4().to_string(),
            collection_id: request.collection_id,
            name: request.name,
            description: request.description,
            method: request.method,
            url: request.url,
            headers,
            body: request.body,
            body_type: request.body_type.unwrap_or_else(|| "json".to_string()),
            auth_type: request.auth_type,
            auth_config,
            follow_redirects: request.follow_redirects.unwrap_or(true),
            timeout_ms: request.timeout_ms.unwrap_or(30000),
            order_index: request.order_index.unwrap_or(0),
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update(&mut self, request: UpdateRequestRequest) {
        if let Some(collection_id) = request.collection_id {
            self.collection_id = collection_id;
        }
        if let Some(name) = request.name {
            self.name = name;
        }
        if let Some(description) = request.description {
            self.description = Some(description);
        }
        if let Some(method) = request.method {
            self.method = method;
        }
        if let Some(url) = request.url {
            self.url = url;
        }
        if let Some(headers) = request.headers {
            self.headers = serde_json::to_string(&headers).unwrap_or_default();
        }
        if let Some(body) = request.body {
            self.body = Some(body);
        }
        if let Some(body_type) = request.body_type {
            self.body_type = body_type;
        }
        if let Some(auth_type) = request.auth_type {
            self.auth_type = Some(auth_type);
        }
        if let Some(auth_config) = request.auth_config {
            self.auth_config = Some(serde_json::to_string(&auth_config).unwrap_or_default());
        }
        if let Some(follow_redirects) = request.follow_redirects {
            self.follow_redirects = follow_redirects;
        }
        if let Some(timeout_ms) = request.timeout_ms {
            self.timeout_ms = timeout_ms;
        }
        if let Some(order_index) = request.order_index {
            self.order_index = order_index;
        }
        self.updated_at = Utc::now();
    }

    /// Parse headers from JSON string back to a map
    pub fn get_headers(&self) -> Result<serde_json::Value, serde_json::Error> {
        if self.headers.is_empty() {
            Ok(serde_json::json!({}))
        } else {
            serde_json::from_str(&self.headers)
        }
    }

    /// Parse auth config from JSON string
    pub fn get_auth_config(&self) -> Result<Option<serde_json::Value>, serde_json::Error> {
        match &self.auth_config {
            Some(config) => Ok(Some(serde_json::from_str(config)?)),
            None => Ok(None),
        }
    }
}