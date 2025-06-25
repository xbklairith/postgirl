use crate::models::workspace::{
    CreateWorkspaceRequest, UpdateWorkspaceRequest, Workspace, WorkspaceSettings, WorkspaceSummary,
};
use crate::services::database_service::DatabaseService;
use crate::services::git_service::GitService;
use std::sync::{Arc, Mutex};
use tauri::State;
use tokio::fs;

// Global state for Database service
pub type DatabaseServiceState = Mutex<Option<Arc<DatabaseService>>>;

// Helper macro to get database service without holding lock across await
macro_rules! get_db {
    ($db_service:expr) => {{
        let db_state = $db_service
            .lock()
            .map_err(|e| format!("Database service lock error: {}", e))?;
        
        db_state
            .as_ref()
            .ok_or("Database not initialized")?
            .clone()
    }};
}

#[tauri::command]
pub async fn workspace_initialize_database(
    database_path: String,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<bool, String> {
    let service = DatabaseService::new(&database_path)
        .await
        .map_err(|e| format!("Failed to initialize database: {}", e))?;

    let mut db_state = db_service
        .lock()
        .map_err(|e| format!("Database service lock error: {}", e))?;
    
    *db_state = Some(Arc::new(service));
    Ok(true)
}

#[tauri::command]
pub async fn workspace_database_health_check(
    db_service: State<'_, DatabaseServiceState>,
) -> Result<bool, String> {
    let db_clone = {
        match db_service.lock() {
            Ok(db_state) => {
                match db_state.as_ref() {
                    Some(db) => Some(db.clone()),
                    None => None
                }
            },
            Err(e) => return Err(format!("Database service lock error: {}", e))
        }
    };

    match db_clone {
        Some(db) => {
            // Try a simple query to verify database is working
            match db.get_all_workspaces().await {
                Ok(_) => Ok(true),
                Err(e) => Err(format!("Database health check failed: {}", e))
            }
        },
        None => Err("Database not initialized".to_string())
    }
}

#[tauri::command]
pub async fn workspace_run_migrations(
    db_service: tauri::State<'_, DatabaseServiceState>,
) -> Result<String, String> {
    let db = {
        let state = db_service.lock().map_err(|e| format!("Database lock error: {}", e))?;
        match state.as_ref() {
            Some(db) => db.clone(),
            None => return Err("Database not initialized".to_string())
        }
    };
    
    // Run the migration to ensure all tables exist (including new environment tables)
    crate::services::database_service::DatabaseService::run_migrations(&db.get_pool()).await
        .map_err(|e| format!("Migration failed: {}", e))?;
    
    Ok("Database migrations completed successfully".to_string())
}

#[tauri::command]
pub async fn workspace_create(
    request: CreateWorkspaceRequest,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<Workspace, String> {
    let db = get_db!(db_service);

    let workspace = Workspace::new(request);
    let workspace_path = expand_tilde_path(&workspace.local_path);
    let git_service = GitService::new();
    
    if let Some(git_url) = &workspace.git_repository_url {
        // Clone existing repository (this will create the directory and populate it)
        eprintln!("Cloning Git repository: {} -> {}", git_url, workspace_path);
        match git_service.clone_repository(git_url, &workspace_path, None) {
            Ok(result) => {
                eprintln!("Git clone result: success={}, message={}", result.success, result.message);
                if !result.success {
                    let detailed_error = if result.message.contains("authentication required") {
                        format!("Git authentication failed. Please ensure:\n• Your SSH key is added to ssh-agent: `ssh-add ~/.ssh/id_rsa`\n• Your SSH key is added to your Git provider (GitHub/GitLab/etc.)\n• The repository URL is correct: {}\n\nOriginal error: {}", git_url, result.message)
                    } else if result.message.contains("not found") || result.message.contains("does not exist") {
                        format!("Repository not found. Please check:\n• The repository URL is correct: {}\n• You have access to the repository\n• The repository exists\n\nOriginal error: {}", git_url, result.message)
                    } else {
                        format!("Failed to clone Git repository: {}", result.message)
                    };
                    return Err(detailed_error);
                }
            }
            Err(e) => {
                eprintln!("Git clone unexpected error: {}", e);
                return Err(format!("Git clone system error: {}", e));
            }
        }
        
        // Create workspace subdirectories inside cloned repo
        let collections_dir = format!("{}/collections", workspace_path);
        let environments_dir = format!("{}/environments", workspace_path);
        let postgirl_dir = format!("{}/.postgirl", workspace_path);
        
        // Only create directories if they don't exist (don't overwrite cloned content)
        if !fs::metadata(&collections_dir).await.is_ok() {
            fs::create_dir_all(&collections_dir)
                .await
                .map_err(|e| format!("Failed to create collections directory: {}", e))?;
        }
        
        if !fs::metadata(&environments_dir).await.is_ok() {
            fs::create_dir_all(&environments_dir)
                .await
                .map_err(|e| format!("Failed to create environments directory: {}", e))?;
        }
        
        if !fs::metadata(&postgirl_dir).await.is_ok() {
            fs::create_dir_all(&postgirl_dir)
                .await
                .map_err(|e| format!("Failed to create .postgirl directory: {}", e))?;
        }
        
    } else {
        // Create the workspace directory first for local-only workspaces
        fs::create_dir_all(&workspace_path)
            .await
            .map_err(|e| format!("Failed to create workspace directory '{}': {}", workspace_path, e))?;

        // Create workspace subdirectories
        let collections_dir = format!("{}/collections", workspace_path);
        let environments_dir = format!("{}/environments", workspace_path);
        let postgirl_dir = format!("{}/.postgirl", workspace_path);
        
        fs::create_dir_all(&collections_dir)
            .await
            .map_err(|e| format!("Failed to create collections directory: {}", e))?;
        
        fs::create_dir_all(&environments_dir)
            .await
            .map_err(|e| format!("Failed to create environments directory: {}", e))?;
        
        fs::create_dir_all(&postgirl_dir)
            .await
            .map_err(|e| format!("Failed to create .postgirl directory: {}", e))?;

        // Initialize new Git repository
        match git_service.initialize_repository(&workspace_path) {
            Ok(result) => {
                if !result.success {
                    eprintln!("Warning: Failed to initialize Git repository: {}", result.message);
                    // Continue with workspace creation even if Git init fails
                }
            }
            Err(e) => {
                eprintln!("Warning: Git initialization error: {}", e);
                // Continue with workspace creation even if Git init fails
            }
        }
        
        // Create default .gitignore file only for new repositories
        let gitignore_path = format!("{}/.gitignore", workspace_path);
        if !fs::metadata(&gitignore_path).await.is_ok() {
            let gitignore_content = r#"# Postgirl workspace files
.postgirl/cache/
.postgirl/logs/
.DS_Store
Thumbs.db

# Environment files with secrets
**/*.env.local
**/*.env.secret

# Temporary files
*.tmp
*.temp
"#;
            
            if let Err(e) = fs::write(&gitignore_path, gitignore_content).await {
                eprintln!("Warning: Failed to create .gitignore file: {}", e);
                // Continue even if .gitignore creation fails
            }
        }
    }

    // Create workspace in database
    db.create_workspace(&workspace)
        .await
        .map_err(|e| format!("Failed to create workspace in database: {}", e))?;

    Ok(workspace)
}

// Helper function to expand tilde paths
fn expand_tilde_path(path: &str) -> String {
    if path.starts_with("~/") {
        if let Ok(home_dir) = std::env::var("HOME") {
            return path.replacen("~", &home_dir, 1);
        }
    }
    path.to_string()
}

#[tauri::command]
pub async fn workspace_check_directory_exists(path: String) -> Result<bool, String> {
    let expanded_path = expand_tilde_path(&path);
    
    match fs::metadata(&expanded_path).await {
        Ok(metadata) => {
            if metadata.is_dir() {
                // Check if directory is empty
                match fs::read_dir(&expanded_path).await {
                    Ok(mut entries) => {
                        // Directory exists and has contents - this would conflict with Git clone
                        Ok(entries.next_entry().await.map_err(|e| e.to_string())?.is_some())
                    }
                    Err(_) => {
                        // Directory exists but can't read it (permission issue)
                        Ok(true)
                    }
                }
            } else {
                // Path exists but is not a directory (file) - this would conflict
                Ok(true)
            }
        }
        Err(_) => {
            // Path doesn't exist - this is good for both Git clone and local creation
            Ok(false)
        }
    }
}

// Additional command to check if parent directory exists and is writable
#[tauri::command]
pub async fn workspace_check_parent_directory(path: String) -> Result<bool, String> {
    let expanded_path = expand_tilde_path(&path);
    
    if let Some(parent) = std::path::Path::new(&expanded_path).parent() {
        match fs::metadata(parent).await {
            Ok(metadata) => {
                if metadata.is_dir() {
                    // Parent exists and is a directory
                    Ok(true)
                } else {
                    // Parent exists but is not a directory
                    Ok(false)
                }
            }
            Err(_) => {
                // Parent doesn't exist
                Ok(false)
            }
        }
    } else {
        // Invalid path (no parent)
        Ok(false)
    }
}

#[tauri::command]
pub async fn workspace_get(
    id: String,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<Option<Workspace>, String> {
    let db = get_db!(db_service);

    db.get_workspace(&id)
        .await
        .map_err(|e| format!("Failed to get workspace: {}", e))
}

#[tauri::command]
pub async fn workspace_get_all(
    db_service: State<'_, DatabaseServiceState>,
) -> Result<Vec<Workspace>, String> {
    let db = get_db!(db_service);

    db.get_all_workspaces()
        .await
        .map_err(|e| format!("Failed to get workspaces: {}", e))
}

#[tauri::command]
pub async fn workspace_get_active(
    db_service: State<'_, DatabaseServiceState>,
) -> Result<Option<Workspace>, String> {
    let db = get_db!(db_service);

    db.get_active_workspace()
        .await
        .map_err(|e| format!("Failed to get active workspace: {}", e))
}

#[tauri::command]
pub async fn workspace_update(
    request: UpdateWorkspaceRequest,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<bool, String> {
    let db = get_db!(db_service);

    // Get existing workspace
    let mut workspace = db
        .get_workspace(&request.id)
        .await
        .map_err(|e| format!("Failed to get workspace: {}", e))?
        .ok_or("Workspace not found")?;

    // Update workspace
    workspace.update(request);

    // Save updated workspace
    db.update_workspace(&workspace)
        .await
        .map_err(|e| format!("Failed to update workspace: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub async fn workspace_delete(
    id: String,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<bool, String> {
    let db = get_db!(db_service);

    db.delete_workspace(&id)
        .await
        .map_err(|e| format!("Failed to delete workspace: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub async fn workspace_set_active(
    id: String,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<bool, String> {
    let db = get_db!(db_service);

    db.set_active_workspace(&id)
        .await
        .map_err(|e| format!("Failed to set active workspace: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub async fn workspace_get_summaries(
    db_service: State<'_, DatabaseServiceState>,
) -> Result<Vec<WorkspaceSummary>, String> {
    let db = get_db!(db_service);

    db.get_workspace_summaries()
        .await
        .map_err(|e| format!("Failed to get workspace summaries: {}", e))
}

#[tauri::command]
pub async fn workspace_access(
    id: String,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<bool, String> {
    let db = get_db!(db_service);

    // Get workspace and update last_accessed_at
    let mut workspace = db
        .get_workspace(&id)
        .await
        .map_err(|e| format!("Failed to get workspace: {}", e))?
        .ok_or("Workspace not found")?;

    workspace.access();

    db.update_workspace(&workspace)
        .await
        .map_err(|e| format!("Failed to update workspace access time: {}", e))?;

    Ok(true)
}

// Workspace Settings commands
#[tauri::command]
pub async fn workspace_settings_create(
    workspace_id: String,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<WorkspaceSettings, String> {
    let db = get_db!(db_service);

    let mut settings = WorkspaceSettings::default();
    settings.workspace_id = workspace_id;

    db.create_workspace_settings(&settings)
        .await
        .map_err(|e| format!("Failed to create workspace settings: {}", e))?;

    Ok(settings)
}

#[tauri::command]
pub async fn workspace_settings_get(
    workspace_id: String,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<Option<WorkspaceSettings>, String> {
    let db = get_db!(db_service);

    db.get_workspace_settings(&workspace_id)
        .await
        .map_err(|e| format!("Failed to get workspace settings: {}", e))
}

#[tauri::command]
pub async fn workspace_settings_update(
    settings: WorkspaceSettings,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<bool, String> {
    let db = get_db!(db_service);

    db.update_workspace_settings(&settings)
        .await
        .map_err(|e| format!("Failed to update workspace settings: {}", e))?;

    Ok(true)
}