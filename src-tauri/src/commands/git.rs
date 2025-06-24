use crate::models::git::*;
use crate::services::{credential_service::CredentialService, git_service::GitService};
use std::sync::Mutex;
use tauri::State;

// Global state for Git service
pub type GitServiceState = Mutex<GitService>;
pub type CredentialServiceState = Mutex<CredentialService>;

#[tauri::command]
pub async fn git_clone_repository(
    url: String,
    path: String,
    credentials: Option<GitCredentials>,
    git_service: State<'_, GitServiceState>,
) -> Result<CloneResult, String> {
    let service = git_service.lock().map_err(|e| format!("Service lock error: {}", e))?;
    
    service
        .clone_repository(&url, &path, credentials.as_ref())
        .map_err(|e| format!("Clone failed: {}", e))
}

#[tauri::command]
pub async fn git_initialize_repository(
    path: String,
    git_service: State<'_, GitServiceState>,
) -> Result<CloneResult, String> {
    let service = git_service.lock().map_err(|e| format!("Service lock error: {}", e))?;
    
    service
        .initialize_repository(&path)
        .map_err(|e| format!("Initialize failed: {}", e))
}

#[tauri::command]
pub async fn git_get_status(
    repo_path: String,
    git_service: State<'_, GitServiceState>,
) -> Result<GitStatus, String> {
    let service = git_service.lock().map_err(|e| format!("Service lock error: {}", e))?;
    
    service
        .get_repository_status(&repo_path)
        .map_err(|e| format!("Status failed: {}", e))
}

#[tauri::command]
pub async fn git_get_branches(
    repo_path: String,
    git_service: State<'_, GitServiceState>,
) -> Result<Vec<Branch>, String> {
    let service = git_service.lock().map_err(|e| format!("Service lock error: {}", e))?;
    
    service
        .get_branches(&repo_path)
        .map_err(|e| format!("Get branches failed: {}", e))
}

#[tauri::command]
pub async fn git_check_repository(
    path: String,
    git_service: State<'_, GitServiceState>,
) -> Result<bool, String> {
    let service = git_service.lock().map_err(|e| format!("Service lock error: {}", e))?;
    
    Ok(service.check_repository_exists(&path))
}

#[tauri::command]
pub async fn git_store_credentials(
    key: String,
    credentials: GitCredentials,
    credential_service: State<'_, CredentialServiceState>,
) -> Result<bool, String> {
    let service = credential_service.lock().map_err(|e| format!("Service lock error: {}", e))?;
    
    service
        .store_credentials(&key, &credentials)
        .map(|_| true)
        .map_err(|e| format!("Store credentials failed: {}", e))
}

#[tauri::command]
pub async fn git_get_credentials(
    key: String,
    credential_service: State<'_, CredentialServiceState>,
) -> Result<GitCredentials, String> {
    let service = credential_service.lock().map_err(|e| format!("Service lock error: {}", e))?;
    
    service
        .get_credentials(&key)
        .map_err(|e| format!("Get credentials failed: {}", e))
}

#[tauri::command]
pub async fn git_delete_credentials(
    key: String,
    credential_service: State<'_, CredentialServiceState>,
) -> Result<bool, String> {
    let service = credential_service.lock().map_err(|e| format!("Service lock error: {}", e))?;
    
    service
        .delete_credentials(&key)
        .map(|_| true)
        .map_err(|e| format!("Delete credentials failed: {}", e))
}

#[tauri::command]
pub async fn git_credentials_exist(
    key: String,
    credential_service: State<'_, CredentialServiceState>,
) -> Result<bool, String> {
    let service = credential_service.lock().map_err(|e| format!("Service lock error: {}", e))?;
    
    Ok(service.credentials_exist(&key))
}