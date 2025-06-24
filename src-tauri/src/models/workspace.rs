use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub git_repository_url: Option<String>,
    pub local_path: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_accessed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkspaceRequest {
    pub name: String,
    pub description: Option<String>,
    pub git_repository_url: Option<String>,
    pub local_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWorkspaceRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub git_repository_url: Option<String>,
    pub local_path: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceSettings {
    pub id: String,
    pub workspace_id: String,
    pub auto_save: bool,
    pub sync_on_startup: bool,
    pub default_timeout: u32,
    pub follow_redirects: bool,
    pub verify_ssl: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub local_path: String,
    pub is_active: bool,
    pub last_accessed_at: Option<DateTime<Utc>>,
    pub git_status: Option<String>,
    pub collection_count: i64,
    pub request_count: i64,
}

impl Workspace {
    pub fn new(request: CreateWorkspaceRequest) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name: request.name,
            description: request.description,
            git_repository_url: request.git_repository_url,
            local_path: request.local_path,
            is_active: false,
            created_at: now,
            updated_at: now,
            last_accessed_at: None,
        }
    }

    pub fn update(&mut self, request: UpdateWorkspaceRequest) {
        if let Some(name) = request.name {
            self.name = name;
        }
        if let Some(description) = request.description {
            self.description = Some(description);
        }
        if let Some(git_repository_url) = request.git_repository_url {
            self.git_repository_url = Some(git_repository_url);
        }
        if let Some(local_path) = request.local_path {
            self.local_path = local_path;
        }
        if let Some(is_active) = request.is_active {
            self.is_active = is_active;
        }
        self.updated_at = Utc::now();
    }

    pub fn access(&mut self) {
        self.last_accessed_at = Some(Utc::now());
        self.updated_at = Utc::now();
    }
}

impl Default for WorkspaceSettings {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            workspace_id: String::new(),
            auto_save: true,
            sync_on_startup: true,
            default_timeout: 30000,
            follow_redirects: true,
            verify_ssl: true,
            created_at: now,
            updated_at: now,
        }
    }
}