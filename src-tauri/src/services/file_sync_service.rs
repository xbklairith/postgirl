use crate::models::collection::{Collection, Request};
use crate::models::environment::Environment;
use crate::services::git_service::GitService;
use anyhow::{Result, anyhow};
use tokio::fs;
use serde_json;
use std::path::Path;

#[derive(Clone)]
pub struct FileSyncService {
    git_service: GitService,
}

impl FileSyncService {
    pub fn new() -> Self {
        Self {
            git_service: GitService::new(),
        }
    }

    /// Get the workspace path from workspace ID by looking it up in the database
    async fn get_workspace_path(&self, _workspace_id: &str) -> Result<String> {
        // For now, we'll use the known workspace path
        // TODO: Look up actual workspace path from database
        let home = std::env::var("HOME").unwrap_or_else(|_| "/".to_string());
        Ok(format!("{}/Documents/Postgirl/postgirl-workspace", home))
    }

    /// Write collection to JSON file
    pub async fn write_collection_file(&self, collection: &Collection, requests: Vec<Request>) -> Result<()> {
        let workspace_path = self.get_workspace_path(&collection.workspace_id).await?;
        let collections_dir = format!("{}/collections", workspace_path);
        
        // Ensure collections directory exists
        fs::create_dir_all(&collections_dir).await
            .map_err(|e| anyhow!("Failed to create collections directory: {}", e))?;

        // Create collection file data
        let collection_data = serde_json::json!({
            "id": collection.id,
            "name": collection.name,
            "description": collection.description,
            "folder_path": collection.folder_path,
            "git_branch": collection.git_branch,
            "is_active": collection.is_active,
            "created_at": collection.created_at.to_rfc3339(),
            "updated_at": collection.updated_at.to_rfc3339(),
            "requests": requests.iter().map(|req| {
                serde_json::json!({
                    "id": req.id,
                    "name": req.name,
                    "description": req.description,
                    "method": req.method,
                    "url": req.url,
                    "headers": req.headers,
                    "body": req.body,
                    "body_type": req.body_type,
                    "auth_type": req.auth_type,
                    "auth_config": req.auth_config,
                    "follow_redirects": req.follow_redirects,
                    "timeout_ms": req.timeout_ms,
                    "order_index": req.order_index,
                    "created_at": req.created_at.to_rfc3339(),
                    "updated_at": req.updated_at.to_rfc3339()
                })
            }).collect::<Vec<_>>()
        });

        // Generate safe filename from collection name
        let safe_filename = self.sanitize_filename(&collection.name);
        let file_path = format!("{}/{}.json", collections_dir, safe_filename);

        // Write JSON file
        let json_content = serde_json::to_string_pretty(&collection_data)
            .map_err(|e| anyhow!("Failed to serialize collection: {}", e))?;

        fs::write(&file_path, json_content).await
            .map_err(|e| anyhow!("Failed to write collection file: {}", e))?;

        println!("✅ Written collection file: {}", file_path);

        // Commit to Git
        self.commit_changes(&workspace_path, &format!("Update collection: {}", collection.name)).await?;

        Ok(())
    }

    /// Delete collection file
    pub async fn delete_collection_file(&self, workspace_id: &str, collection_name: &str) -> Result<()> {
        let workspace_path = self.get_workspace_path(workspace_id).await?;
        let collections_dir = format!("{}/collections", workspace_path);
        
        let safe_filename = self.sanitize_filename(collection_name);
        let file_path = format!("{}/{}.json", collections_dir, safe_filename);

        if Path::new(&file_path).exists() {
            fs::remove_file(&file_path).await
                .map_err(|e| anyhow!("Failed to delete collection file: {}", e))?;
            
            println!("🗑️ Deleted collection file: {}", file_path);

            // Commit to Git
            self.commit_changes(&workspace_path, &format!("Delete collection: {}", collection_name)).await?;
        }

        Ok(())
    }

    /// Commit changes to Git repository
    async fn commit_changes(&self, workspace_path: &str, commit_message: &str) -> Result<()> {
        // Add all changes
        match self.git_service.add_all_changes(workspace_path) {
            Ok(result) => {
                if !result.success {
                    eprintln!("Warning: Failed to add changes to Git: {}", result.message);
                    return Ok(()); // Don't fail the entire operation
                }
            }
            Err(e) => {
                eprintln!("Warning: Git add error: {}", e);
                return Ok(()); // Don't fail the entire operation
            }
        }

        // Commit changes
        match self.git_service.commit_changes(workspace_path, commit_message) {
            Ok(result) => {
                if result.success {
                    println!("📝 Git commit: {}", commit_message);
                } else {
                    eprintln!("Warning: Failed to commit to Git: {}", result.message);
                }
            }
            Err(e) => {
                eprintln!("Warning: Git commit error: {}", e);
            }
        }

        Ok(())
    }

    /// Sanitize filename to be filesystem-safe
    fn sanitize_filename(&self, name: &str) -> String {
        name.chars()
            .map(|c| match c {
                ' ' => '-',
                '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
                c if c.is_control() => '_',
                c => c,
            })
            .collect::<String>()
            .trim_matches('.')
            .to_lowercase()
    }

    /// Write environment to JSON file
    pub async fn write_environment_file(&self, workspace_id: &str, environment: &Environment) -> Result<()> {
        let workspace_path = self.get_workspace_path(workspace_id).await?;
        let environments_dir = format!("{}/environments", workspace_path);
        
        // Ensure environments directory exists
        fs::create_dir_all(&environments_dir).await
            .map_err(|e| anyhow!("Failed to create environments directory: {}", e))?;

        // Create environment file data
        let environment_data = serde_json::json!({
            "id": environment.id,
            "name": environment.name,
            "variables": environment.variables,
            "is_active": environment.is_active,
            "created_at": environment.created_at.to_rfc3339(),
            "updated_at": environment.updated_at.to_rfc3339()
        });

        // Generate safe filename from environment name
        let safe_filename = self.sanitize_filename(&environment.name);
        let file_path = format!("{}/{}.json", environments_dir, safe_filename);

        // Write JSON file
        let json_content = serde_json::to_string_pretty(&environment_data)
            .map_err(|e| anyhow!("Failed to serialize environment: {}", e))?;

        fs::write(&file_path, json_content).await
            .map_err(|e| anyhow!("Failed to write environment file: {}", e))?;

        println!("✅ Written environment file: {}", file_path);

        // Commit to Git
        self.commit_changes(&workspace_path, &format!("Update environment: {}", environment.name)).await?;

        Ok(())
    }

    /// Delete environment file
    pub async fn delete_environment_file(&self, workspace_id: &str, environment_name: &str) -> Result<()> {
        let workspace_path = self.get_workspace_path(workspace_id).await?;
        let environments_dir = format!("{}/environments", workspace_path);
        
        let safe_filename = self.sanitize_filename(environment_name);
        let file_path = format!("{}/{}.json", environments_dir, safe_filename);

        if Path::new(&file_path).exists() {
            fs::remove_file(&file_path).await
                .map_err(|e| anyhow!("Failed to delete environment file: {}", e))?;
            
            println!("🗑️ Deleted environment file: {}", file_path);

            // Commit to Git
            self.commit_changes(&workspace_path, &format!("Delete environment: {}", environment_name)).await?;
        }

        Ok(())
    }

    /// Read environment from file
    pub async fn read_environment_file(&self, workspace_id: &str, environment_name: &str) -> Result<Option<Environment>> {
        let workspace_path = self.get_workspace_path(workspace_id).await?;
        let environments_dir = format!("{}/environments", workspace_path);
        
        let safe_filename = self.sanitize_filename(environment_name);
        let file_path = format!("{}/{}.json", environments_dir, safe_filename);

        if !Path::new(&file_path).exists() {
            return Ok(None);
        }

        let json_content = fs::read_to_string(&file_path).await
            .map_err(|e| anyhow!("Failed to read environment file: {}", e))?;

        let environment_data: serde_json::Value = serde_json::from_str(&json_content)
            .map_err(|e| anyhow!("Failed to parse environment file: {}", e))?;

        // Parse the environment data
        let environment = Environment {
            id: environment_data["id"].as_str().unwrap_or_default().to_string(),
            name: environment_data["name"].as_str().unwrap_or_default().to_string(),
            variables: serde_json::from_value(environment_data["variables"].clone())
                .unwrap_or_default(),
            is_active: environment_data["is_active"].as_bool().unwrap_or(false),
            created_at: chrono::DateTime::parse_from_rfc3339(
                environment_data["created_at"].as_str().unwrap_or("1970-01-01T00:00:00Z")
            ).unwrap_or_default().with_timezone(&chrono::Utc),
            updated_at: chrono::DateTime::parse_from_rfc3339(
                environment_data["updated_at"].as_str().unwrap_or("1970-01-01T00:00:00Z")
            ).unwrap_or_default().with_timezone(&chrono::Utc),
        };

        Ok(Some(environment))
    }

    /// List all environment files in the workspace
    pub async fn list_environment_files(&self, workspace_id: &str) -> Result<Vec<String>> {
        let workspace_path = self.get_workspace_path(workspace_id).await?;
        let environments_dir = format!("{}/environments", workspace_path);
        
        if !Path::new(&environments_dir).exists() {
            return Ok(Vec::new());
        }

        let mut environment_names = Vec::new();
        let mut entries = fs::read_dir(&environments_dir).await
            .map_err(|e| anyhow!("Failed to read environments directory: {}", e))?;

        while let Some(entry) = entries.next_entry().await
            .map_err(|e| anyhow!("Failed to read directory entry: {}", e))? {
            
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    environment_names.push(stem.to_string());
                }
            }
        }

        Ok(environment_names)
    }
}