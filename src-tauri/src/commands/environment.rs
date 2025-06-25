use crate::models::environment::*;
use crate::services::environment_service::EnvironmentService;
use crate::commands::workspace::DatabaseServiceState;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

// Macro to get or initialize the environment service from state with error handling
macro_rules! get_environment_service {
    ($service_state:expr, $db_state:expr) => {{
        let mut service_state = $service_state.lock().map_err(|e| format!("Environment service lock error: {}", e))?;
        
        if service_state.is_none() {
            // Initialize the environment service with database
            let db_state = $db_state.lock().map_err(|e| format!("Database service lock error: {}", e))?;
            if let Some(ref db_service) = *db_state {
                *service_state = Some(EnvironmentService::new(db_service.clone()));
            } else {
                return Err("Database service not initialized".to_string());
            }
        }
        
        service_state.as_ref().unwrap().clone()
    }};
}

#[tauri::command]
pub async fn create_environment(
    workspace_id: String,
    name: String,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<Environment, String> {
    let service = get_environment_service!(service_state, db_state);
    service.create_environment(workspace_id, name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_environment(
    environment_id: String,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<Option<Environment>, String> {
    let service = get_environment_service!(service_state, db_state);
    service.get_environment(&environment_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_environment(
    environment: Environment,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<Environment, String> {
    let service = get_environment_service!(service_state, db_state);
    service.update_environment(environment)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_environment(
    environment_id: String,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<bool, String> {
    let service = get_environment_service!(service_state, db_state);
    service.delete_environment(&environment_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_environments(
    workspace_id: String,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<Vec<Environment>, String> {
    let service = get_environment_service!(service_state, db_state);
    service.list_environments(&workspace_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_environment_variable(
    environment_id: String,
    variable: EnvironmentVariable,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<Environment, String> {
    let service = get_environment_service!(service_state, db_state);
    service.add_variable(&environment_id, variable)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_environment_variable(
    environment_id: String,
    variable: EnvironmentVariable,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<Environment, String> {
    let service = get_environment_service!(service_state, db_state);
    service.update_variable(&environment_id, variable)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_environment_variable(
    environment_id: String,
    variable_key: String,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<Environment, String> {
    let service = get_environment_service!(service_state, db_state);
    service.remove_variable(&environment_id, &variable_key)
        .await
        .map_err(|e| e.to_string())
}


#[tauri::command]
pub async fn substitute_environment_variables(
    text: String,
    variables: HashMap<String, String>,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<String, String> {
    let service = get_environment_service!(service_state, db_state);
    Ok(service.substitute_variables(&text, &variables))
}

#[tauri::command]
pub async fn extract_environment_variables(
    text: String,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<Vec<String>, String> {
    let service = get_environment_service!(service_state, db_state);
    Ok(service.extract_variables(&text))
}

#[tauri::command]
pub async fn create_default_environments(
    workspace_id: String,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<Vec<Environment>, String> {
    let service = get_environment_service!(service_state, db_state);
    
    let mut environments = Vec::new();
    let default_env_names = vec![
        ("Development", "Development environment"),
        ("Staging", "Staging environment for testing"),
        ("Production", "Production environment"),
    ];

    for (name, _description) in default_env_names {
        let env = service.create_environment(
            workspace_id.clone(),
            name.to_string(),
        ).await.map_err(|e| e.to_string())?;
        
        environments.push(env);
    }

    // Set the first environment (Development) as active
    if let Some(first_env) = environments.first_mut() {
        first_env.is_active = true;
        *first_env = service.update_environment(first_env.clone())
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(environments)
}

#[tauri::command]
pub async fn set_active_environment(
    workspace_id: String,
    environment_id: String,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<bool, String> {
    let service = get_environment_service!(service_state, db_state);
    
    // Get all environments for the workspace
    let environments = service.list_environments(&workspace_id)
        .await
        .map_err(|e| e.to_string())?;

    // Deactivate all environments and activate the selected one
    for mut env in environments {
        let should_be_active = env.id == environment_id;
        if env.is_active != should_be_active {
            env.is_active = should_be_active;
            service.update_environment(env)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(true)
}

#[tauri::command]
pub async fn get_active_environment(
    workspace_id: String,
    service_state: tauri::State<'_, Arc<Mutex<Option<EnvironmentService>>>>,
    db_state: tauri::State<'_, DatabaseServiceState>,
) -> Result<Option<Environment>, String> {
    let service = get_environment_service!(service_state, db_state);
    
    let environments = service.list_environments(&workspace_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(environments.into_iter().find(|env| env.is_active))
}