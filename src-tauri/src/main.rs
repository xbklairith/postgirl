// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;

use commands::{collection::*, environment::*, git::*, git_branch_commands::*, http::*, workspace::*};
use services::{credential_service::CredentialService, environment_service::EnvironmentService, git_service::GitService, http_service::HttpService, database_service::DatabaseService};
use tauri::Manager;
use std::sync::{Mutex, Arc};

// Initialize database on application startup
async fn initialize_database_on_startup(app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app_handle.path().app_data_dir().unwrap();
    let db_path = app_data_dir.join("postgirl.db");
    
    // Ensure the app data directory exists
    if let Some(parent) = db_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    
    let db_path_str = db_path.to_string_lossy().to_string();
    
    // Initialize database service
    let database_service = DatabaseService::new(&db_path_str).await?;
    
    // Get the database service state and update it
    let db_service_state = app_handle.state::<DatabaseServiceState>();
    let mut db_state = db_service_state.lock().map_err(|e| format!("Database service lock error: {}", e))?;
    *db_state = Some(Arc::new(database_service));
    
    Ok(())
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Postgirl.", name)
}

#[tauri::command]
async fn health_check() -> Result<String, String> {
    Ok("Postgirl backend is running!".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(GitServiceState::new(GitService::new()))
        .manage(CredentialServiceState::new(CredentialService::new()))
        .manage(DatabaseServiceState::new(None))
        .manage(std::sync::Arc::new(std::sync::Mutex::new(HttpService::new())))
        .manage(std::sync::Arc::new(std::sync::Mutex::new(EnvironmentService::new())))
        .manage(Mutex::new(None::<services::git_branch_service::GitBranchService>))
        .invoke_handler(tauri::generate_handler![
            greet,
            health_check,
            git_clone_repository,
            git_initialize_repository,
            git_get_status,
            git_get_branches,
            git_check_repository,
            git_store_credentials,
            git_get_credentials,
            git_delete_credentials,
            git_credentials_exist,
            workspace_initialize_database,
            workspace_database_health_check,
            workspace_create,
            workspace_get,
            workspace_get_all,
            workspace_get_active,
            workspace_update,
            workspace_delete,
            workspace_set_active,
            workspace_get_summaries,
            workspace_access,
            workspace_settings_create,
            workspace_settings_get,
            workspace_settings_update,
            execute_http_request,
            test_http_connection,
            get_supported_http_methods,
            create_default_http_request,
            validate_http_url,
            parse_curl_command,
            format_http_response_debug,
            create_environment,
            get_environment,
            update_environment,
            delete_environment,
            list_environments,
            add_environment_variable,
            update_environment_variable,
            remove_environment_variable,
            substitute_environment_variables,
            extract_environment_variables,
            create_default_environments,
            set_active_environment,
            get_active_environment,
            create_collection,
            get_collection,
            update_collection,
            delete_collection,
            list_collections,
            get_collection_summaries,
            create_request,
            get_request,
            update_request,
            delete_request,
            list_requests,
            duplicate_request,
            reorder_requests,
            init_git_branch_service,
            get_system_info,
            get_branch_config,
            generate_branch_name,
            suggest_branch_pattern,
            create_branch,
            list_branches,
            get_branch_history,
            get_suggested_branches,
            update_branch_config,
            quick_create_feature_branch
        ])
        .setup(|app| {
            // Initialize database on startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match initialize_database_on_startup(app_handle).await {
                    Ok(_) => println!("Database initialized successfully"),
                    Err(e) => eprintln!("Failed to initialize database: {}", e),
                }
            });

            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}