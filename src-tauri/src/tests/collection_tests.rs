#[cfg(test)]
mod tests {
    use crate::models::collection::*;
    use crate::services::collection_service::CollectionService;
    use crate::services::database_service::DatabaseService;
    use std::sync::Arc;
    use tempfile::TempDir;

    async fn create_test_database() -> Arc<DatabaseService> {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db_path = temp_dir.path().join("test.db");
        let db = DatabaseService::new(db_path.to_str().unwrap()).await
            .expect("Failed to create database service");
        Arc::new(db)
    }

    #[tokio::test]
    async fn test_collection_creation() {
        let db = create_test_database().await;
        let service = CollectionService::new(db.clone());
        
        let request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Test Collection".to_string(),
            description: Some("A test collection".to_string()),
            folder_path: None,
            git_branch: None,
        };

        let result = service.create_collection(request).await;
        assert!(result.is_ok());
        
        let collection = result.unwrap();
        assert_eq!(collection.name, "Test Collection");
        assert_eq!(collection.description, Some("A test collection".to_string()));
        assert_eq!(collection.workspace_id, "test-workspace");
        assert!(collection.parent_id.is_none());
    }

    #[tokio::test]
    async fn test_nested_collection_creation() {
        let db = create_test_database().await;
        let service = CollectionService::new(db.clone());
        
        // Create parent collection
        let parent_request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Parent Collection".to_string(),
            description: None,
            folder_path: None,
            git_branch: None,
        };
        let parent = service.create_collection(parent_request).await.unwrap();
        
        // Create child collection
        let child_request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Child Collection".to_string(),
            description: None,
            folder_path: Some(format!("parent/{}", parent.name)),
            git_branch: None,
        };
        let child = service.create_collection(child_request).await.unwrap();
        
        assert_eq!(child.folder_path, Some(format!("parent/{}", parent.name)));
        assert_eq!(child.name, "Child Collection");
    }

    #[tokio::test]
    async fn test_collection_list_by_workspace() {
        let db = create_test_database().await;
        let service = CollectionService::new(db.clone());
        
        let workspace_id = "test-workspace";
        
        // Create multiple collections
        for i in 0..3 {
            let request = CreateCollectionRequest {
                workspace_id: workspace_id.to_string(),
                name: format!("Collection {}", i),
                description: Some(format!("Description {}", i)),
                parent_id: None,
            };
            service.create_collection(request).await.unwrap();
        }
        
        let collections = service.list_collections(workspace_id).await.unwrap();
        assert_eq!(collections.len(), 3);
    }

    #[tokio::test]
    async fn test_collection_update() {
        let db = create_test_database().await;
        let service = CollectionService::new(db.clone());
        
        // Create collection
        let request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Original Name".to_string(),
            description: Some("Original description".to_string()),
            parent_id: None,
        };
        let mut collection = service.create_collection(request).await.unwrap();
        
        // Update collection
        collection.name = "Updated Name".to_string();
        collection.description = Some("Updated description".to_string());
        
        let updated = service.update_collection(collection).await.unwrap();
        assert_eq!(updated.name, "Updated Name");
        assert_eq!(updated.description, Some("Updated description".to_string()));
    }

    #[tokio::test]
    async fn test_collection_deletion() {
        let db = create_test_database().await;
        let service = CollectionService::new(db.clone());
        
        // Create collection
        let request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "To Delete".to_string(),
            description: None,
            parent_id: None,
        };
        let collection = service.create_collection(request).await.unwrap();
        let collection_id = collection.id.clone();
        
        // Delete collection
        let result = service.delete_collection(&collection_id).await;
        assert!(result.is_ok());
        
        // Verify deletion
        let collections = service.list_collections("test-workspace").await.unwrap();
        assert!(!collections.iter().any(|c| c.id == collection_id));
    }

    #[tokio::test]
    async fn test_request_creation_in_collection() {
        let db = create_test_database().await;
        let service = CollectionService::new(db.clone());
        
        // Create collection
        let collection_request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Test Collection".to_string(),
            description: None,
            parent_id: None,
        };
        let collection = service.create_collection(collection_request).await.unwrap();
        
        // Create HTTP request in collection
        let mut http_request = HttpRequest::default();
        http_request.name = "Test Request".to_string();
        http_request.url = "https://api.example.com/test".to_string();
        http_request.method = HttpMethod::Post;
        
        let request = CreateHttpRequestRequest {
            collection_id: collection.id.clone(),
            http_request,
        };
        
        let result = service.create_request(request).await;
        assert!(result.is_ok());
        
        let created_request = result.unwrap();
        assert_eq!(created_request.name, "Test Request");
        assert_eq!(created_request.url, "https://api.example.com/test");
        assert_eq!(created_request.method, HttpMethod::Post);
        assert_eq!(created_request.collection_id, collection.id);
    }

    #[tokio::test]
    async fn test_request_list_by_collection() {
        let db = create_test_database().await;
        let service = CollectionService::new(db.clone());
        
        // Create collection
        let collection_request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Test Collection".to_string(),
            description: None,
            parent_id: None,
        };
        let collection = service.create_collection(collection_request).await.unwrap();
        
        // Create multiple requests
        for i in 0..3 {
            let mut http_request = HttpRequest::default();
            http_request.name = format!("Request {}", i);
            http_request.url = format!("https://api.example.com/endpoint{}", i);
            
            let request = CreateHttpRequestRequest {
                collection_id: collection.id.clone(),
                http_request,
            };
            service.create_request(request).await.unwrap();
        }
        
        let requests = service.list_requests(&collection.id).await.unwrap();
        assert_eq!(requests.len(), 3);
    }

    #[tokio::test]
    async fn test_request_update() {
        let db = create_test_database().await;
        let service = CollectionService::new(db.clone());
        
        // Create collection
        let collection_request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Test Collection".to_string(),
            description: None,
            parent_id: None,
        };
        let collection = service.create_collection(collection_request).await.unwrap();
        
        // Create request
        let mut http_request = HttpRequest::default();
        http_request.name = "Original Request".to_string();
        
        let request = CreateHttpRequestRequest {
            collection_id: collection.id.clone(),
            http_request,
        };
        let mut created_request = service.create_request(request).await.unwrap();
        
        // Update request
        created_request.name = "Updated Request".to_string();
        created_request.url = "https://api.example.com/updated".to_string();
        created_request.method = HttpMethod::Put;
        
        let updated = service.update_request(created_request).await.unwrap();
        assert_eq!(updated.name, "Updated Request");
        assert_eq!(updated.url, "https://api.example.com/updated");
        assert_eq!(updated.method, HttpMethod::Put);
    }

    #[tokio::test]
    async fn test_request_deletion() {
        let db = create_test_database().await;
        let service = CollectionService::new(db.clone());
        
        // Create collection
        let collection_request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Test Collection".to_string(),
            description: None,
            parent_id: None,
        };
        let collection = service.create_collection(collection_request).await.unwrap();
        
        // Create request
        let http_request = HttpRequest::default();
        let request = CreateHttpRequestRequest {
            collection_id: collection.id.clone(),
            http_request,
        };
        let created_request = service.create_request(request).await.unwrap();
        let request_id = created_request.id.clone();
        
        // Delete request
        let result = service.delete_request(&request_id).await;
        assert!(result.is_ok());
        
        // Verify deletion
        let requests = service.list_requests(&collection.id).await.unwrap();
        assert!(!requests.iter().any(|r| r.id == request_id));
    }

    #[tokio::test]
    async fn test_collection_hierarchy() {
        let db = create_test_database().await;
        let service = CollectionService::new(db.clone());
        
        // Create parent collection
        let parent_request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Parent".to_string(),
            description: None,
            parent_id: None,
        };
        let parent = service.create_collection(parent_request).await.unwrap();
        
        // Create child collection
        let child_request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Child".to_string(),
            description: None,
            parent_id: Some(parent.id.clone()),
        };
        let child = service.create_collection(child_request).await.unwrap();
        
        // Create grandchild collection
        let grandchild_request = CreateCollectionRequest {
            workspace_id: "test-workspace".to_string(),
            name: "Grandchild".to_string(),
            description: None,
            parent_id: Some(child.id.clone()),
        };
        let grandchild = service.create_collection(grandchild_request).await.unwrap();
        
        // Verify hierarchy
        assert!(parent.parent_id.is_none());
        assert_eq!(child.parent_id, Some(parent.id));
        assert_eq!(grandchild.parent_id, Some(child.id));
        
        // List all collections and verify they're all present
        let all_collections = service.list_collections("test-workspace").await.unwrap();
        assert_eq!(all_collections.len(), 3);
    }

    #[test]
    fn test_collection_model_creation() {
        let collection = Collection {
            id: "test-id".to_string(),
            workspace_id: "workspace-id".to_string(),
            name: "Test Collection".to_string(),
            description: Some("Description".to_string()),
            parent_id: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        
        assert_eq!(collection.name, "Test Collection");
        assert_eq!(collection.workspace_id, "workspace-id");
        assert!(collection.description.is_some());
    }

    #[test]
    fn test_create_collection_request_validation() {
        let request = CreateCollectionRequest {
            workspace_id: "workspace".to_string(),
            name: "Collection".to_string(),
            description: None,
            parent_id: Some("parent-id".to_string()),
        };
        
        assert_eq!(request.workspace_id, "workspace");
        assert_eq!(request.name, "Collection");
        assert_eq!(request.parent_id, Some("parent-id".to_string()));
    }

    #[test]
    fn test_create_http_request_request_validation() {
        let http_request = HttpRequest::default();
        let request = CreateHttpRequestRequest {
            collection_id: "collection-id".to_string(),
            http_request,
        };
        
        assert_eq!(request.collection_id, "collection-id");
        assert_eq!(request.http_request.method, HttpMethod::Get);
    }
}