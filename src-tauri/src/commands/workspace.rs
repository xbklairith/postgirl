use crate::models::workspace::{
    CreateWorkspaceRequest, UpdateWorkspaceRequest, Workspace, WorkspaceSettings, WorkspaceSummary,
};
use crate::services::database_service::DatabaseService;
use std::sync::{Arc, Mutex};
use tauri::State;

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
    match db_service.lock() {
        Ok(db_state) => {
            match db_state.as_ref() {
                Some(db) => {
                    // Try a simple query to verify database is working
                    match db.get_all_workspaces().await {
                        Ok(_) => Ok(true),
                        Err(e) => Err(format!("Database health check failed: {}", e))
                    }
                },
                None => Err("Database not initialized".to_string())
            }
        },
        Err(e) => Err(format!("Database service lock error: {}", e))
    }
}

#[tauri::command]
pub async fn workspace_create(
    request: CreateWorkspaceRequest,
    db_service: State<'_, DatabaseServiceState>,
) -> Result<Workspace, String> {
    let db = get_db!(db_service);

    let workspace = Workspace::new(request);
    
    db.create_workspace(&workspace)
        .await
        .map_err(|e| format!("Failed to create workspace: {}", e))?;

    Ok(workspace)
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