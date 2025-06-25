use crate::models::git::{
    BranchConfig, BranchCreateRequest, BranchCreateResult, BranchPattern, FeatureType, GitBranch,
    SystemInfo,
};
use crate::services::git_branch_service::GitBranchService;
use anyhow::Result;
use tauri::{command, AppHandle, State};
use std::sync::Mutex;

#[command]
pub async fn init_git_branch_service(
    app_handle: AppHandle,
    service_state: State<'_, Mutex<Option<GitBranchService>>>,
) -> Result<(), String> {
    let service = GitBranchService::new(&app_handle).await.map_err(|e| e.to_string())?;
    *service_state.lock().unwrap() = Some(service);
    Ok(())
}

#[command]
pub async fn get_system_info(service_state: State<'_, Mutex<Option<GitBranchService>>>) -> Result<SystemInfo, String> {
    let service_guard = service_state.lock().unwrap();
    let service = service_guard
        .as_ref()
        .ok_or("Git branch service not initialized")?;
    
    Ok(service.get_system_info().clone())
}

#[command]
pub async fn get_branch_config(
    service_state: State<'_, Mutex<Option<GitBranchService>>>,
) -> Result<BranchConfig, String> {
    let service_guard = service_state.lock().unwrap();
    let service = service_guard
        .as_ref()
        .ok_or("Git branch service not initialized")?;
    
    Ok(service.get_branch_config().clone())
}

#[command]
pub async fn generate_branch_name(
    pattern: BranchPattern,
    service_state: State<'_, Mutex<Option<GitBranchService>>>,
) -> Result<String, String> {
    let service_guard = service_state.lock().unwrap();
    let service = service_guard
        .as_ref()
        .ok_or("Git branch service not initialized")?;
    
    service.generate_branch_name(&pattern).map_err(|e| e.to_string())
}

#[command]
pub async fn suggest_branch_pattern(
    workspace_name: String,
    feature_type: Option<FeatureType>,
    service_state: State<'_, Mutex<Option<GitBranchService>>>,
) -> Result<BranchPattern, String> {
    let service_guard = service_state.lock().unwrap();
    let service = service_guard
        .as_ref()
        .ok_or("Git branch service not initialized")?;
    
    Ok(service.suggest_pattern(&workspace_name, feature_type))
}

#[command]
pub async fn create_branch(
    workspace_path: String,
    request: BranchCreateRequest,
    service_state: State<'_, Mutex<Option<GitBranchService>>>,
) -> Result<BranchCreateResult, String> {
    let service = {
        let service_guard = service_state.lock().unwrap();
        service_guard
            .as_ref()
            .ok_or("Git branch service not initialized")?
            .clone()
    };
    
    service
        .create_branch(&workspace_path, &request)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn list_branches(
    workspace_path: String,
    service_state: State<'_, Mutex<Option<GitBranchService>>>,
) -> Result<Vec<GitBranch>, String> {
    let service_guard = service_state.lock().unwrap();
    let service = service_guard
        .as_ref()
        .ok_or("Git branch service not initialized")?;
    
    service.list_branches(&workspace_path).map_err(|e| e.to_string())
}

#[command]
pub async fn get_branch_history(
    limit: Option<i32>,
    service_state: State<'_, Mutex<Option<GitBranchService>>>,
) -> Result<Vec<(String, BranchPattern, chrono::DateTime<chrono::Utc>)>, String> {
    let service = {
        let service_guard = service_state.lock().unwrap();
        service_guard
            .as_ref()
            .ok_or("Git branch service not initialized")?
            .clone()
    };
    
    service
        .get_branch_history(limit)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_suggested_branches(
    workspace_name: String,
    service_state: State<'_, Mutex<Option<GitBranchService>>>,
) -> Result<Vec<(FeatureType, String)>, String> {
    let service_guard = service_state.lock().unwrap();
    let service = service_guard
        .as_ref()
        .ok_or("Git branch service not initialized")?;
    
    Ok(service.get_suggested_branches(&workspace_name))
}

#[command]
pub async fn update_branch_config(
    config: BranchConfig,
    service_state: State<'_, Mutex<Option<GitBranchService>>>,
) -> Result<(), String> {
    let mut service_guard = service_state.lock().unwrap();
    let service = service_guard
        .as_mut()
        .ok_or("Git branch service not initialized")?;
    
    service.update_config(config).map_err(|e| e.to_string())
}

/// Quick action to create a feature branch with minimal input
#[command]
pub async fn quick_create_feature_branch(
    workspace_path: String,
    workspace_name: String,
    description: String,
    feature_type: Option<FeatureType>,
    service_state: State<'_, Mutex<Option<GitBranchService>>>,
) -> Result<BranchCreateResult, String> {
    let service = {
        let service_guard = service_state.lock().unwrap();
        service_guard
            .as_ref()
            .ok_or("Git branch service not initialized")?
            .clone()
    };
    
    let mut pattern = service.suggest_pattern(&workspace_name, feature_type);
    pattern.description = Some(description);
    
    let request = BranchCreateRequest {
        pattern,
        base_branch: None, // Use current branch
        auto_switch: true, // Switch to new branch
    };
    
    service
        .create_branch(&workspace_path, &request)
        .await
        .map_err(|e| e.to_string())
}