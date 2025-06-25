use crate::models::collection::{
    Collection, Request, CreateCollectionRequest, UpdateCollectionRequest,
    CreateRequestRequest, UpdateRequestRequest, CollectionSummary,
};
use crate::services::collection_service::CollectionService;
use crate::services::database_service::DatabaseService;
use std::sync::{Arc, Mutex};
use tauri::State;

// Helper macro to get database service and create collection service
macro_rules! get_collection_service {
    ($db_service:expr) => {{
        let db_state = $db_service
            .lock()
            .map_err(|e| format!("Database service lock error: {}", e))?;
        
        let db_service = db_state
            .as_ref()
            .ok_or("Database not initialized")?
            .clone();
            
        let pool = db_service.get_pool();
            
        CollectionService::new(pool)
    }};
}

// Collection Commands
#[tauri::command]
pub async fn create_collection(
    request: CreateCollectionRequest,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<Collection, String> {
    let service = get_collection_service!(db_service);
    service.create_collection(request).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_collection(
    id: String,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<Option<Collection>, String> {
    let service = get_collection_service!(db_service);
    service.get_collection(&id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_collection(
    request: UpdateCollectionRequest,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<Collection, String> {
    let service = get_collection_service!(db_service);
    service.update_collection(request).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_collection(
    id: String,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<(), String> {
    let service = get_collection_service!(db_service);
    service.delete_collection(&id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_collections(
    workspace_id: String,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<Vec<Collection>, String> {
    let service = get_collection_service!(db_service);
    service.list_collections(&workspace_id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_collection_summaries(
    workspace_id: String,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<Vec<CollectionSummary>, String> {
    let service = get_collection_service!(db_service);
    service.get_collection_summaries(&workspace_id).await
        .map_err(|e| e.to_string())
}

// Request Commands
#[tauri::command]
pub async fn create_request(
    request: CreateRequestRequest,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<Request, String> {
    let service = get_collection_service!(db_service);
    service.create_request(request).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_request(
    id: String,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<Option<Request>, String> {
    let service = get_collection_service!(db_service);
    service.get_request(&id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_request(
    request: UpdateRequestRequest,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<Request, String> {
    let service = get_collection_service!(db_service);
    service.update_request(request).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_request(
    id: String,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<(), String> {
    let service = get_collection_service!(db_service);
    service.delete_request(&id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_requests(
    collection_id: String,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<Vec<Request>, String> {
    let service = get_collection_service!(db_service);
    service.list_requests(&collection_id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn duplicate_request(
    id: String,
    new_name: String,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<Request, String> {
    let service = get_collection_service!(db_service);
    service.duplicate_request(&id, &new_name).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn reorder_requests(
    collection_id: String,
    request_orders: Vec<(String, i32)>,
    db_service: State<'_, Mutex<Option<Arc<DatabaseService>>>>,
) -> Result<(), String> {
    let service = get_collection_service!(db_service);
    service.reorder_requests(&collection_id, request_orders).await
        .map_err(|e| e.to_string())
}