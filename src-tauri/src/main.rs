// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;

use commands::{git::*, workspace::*};
use services::{credential_service::CredentialService, git_service::GitService};
use std::sync::Mutex;
use tauri::Manager;

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
            workspace_settings_update
        ])
        .setup(|app| {
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