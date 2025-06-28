#[cfg(test)]
mod tests {
    use crate::services::database_service::DatabaseService;
    use crate::models::workspace::*;
    use tempfile::TempDir;

    async fn create_test_database() -> DatabaseService {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db_path = temp_dir.path().join("test.db");
        DatabaseService::new(db_path.to_str().unwrap()).await
            .expect("Failed to create database service")
    }

    #[tokio::test]
    async fn test_database_creation_and_migrations() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        
        let db = DatabaseService::new(db_path.to_str().unwrap()).await;
        assert!(db.is_ok());
        
        let db = db.unwrap();
        
        // Test that the database file was created
        assert!(db_path.exists());
        
        // Test that we can perform basic operations
        let workspaces = db.get_all_workspaces().await;
        assert!(workspaces.is_ok());
        assert_eq!(workspaces.unwrap().len(), 0);
    }

    #[tokio::test]
    async fn test_workspace_crud_operations() {
        let db = create_test_database().await;
        
        // Create workspace
        let request = CreateWorkspaceRequest {
            name: "Test Workspace".to_string(),
            description: Some("A test workspace".to_string()),
            workspace_type: WorkspaceType::Local,
            local_path: "/tmp/test-workspace".to_string(),
            git_repository_url: None,
            git_branch: None,
            git_username: None,
            git_email: None,
        };
        
        let workspace = Workspace::new(request);
        let workspace_id = workspace.id.clone();
        
        // Test create
        let result = db.create_workspace(&workspace).await;
        assert!(result.is_ok());
        
        // Test get by ID
        let retrieved = db.get_workspace(&workspace_id).await.unwrap();
        assert!(retrieved.is_some());
        let retrieved_workspace = retrieved.unwrap();
        assert_eq!(retrieved_workspace.name, "Test Workspace");
        assert_eq!(retrieved_workspace.description, Some("A test workspace".to_string()));
        
        // Test get all
        let all_workspaces = db.get_all_workspaces().await.unwrap();
        assert_eq!(all_workspaces.len(), 1);
        
        // Test update
        let mut updated_workspace = retrieved_workspace.clone();
        updated_workspace.name = "Updated Workspace".to_string();
        updated_workspace.description = Some("Updated description".to_string());
        
        let update_result = db.update_workspace(&updated_workspace).await;
        assert!(update_result.is_ok());
        
        // Verify update
        let updated_retrieved = db.get_workspace(&workspace_id).await.unwrap().unwrap();
        assert_eq!(updated_retrieved.name, "Updated Workspace");
        assert_eq!(updated_retrieved.description, Some("Updated description".to_string()));
        
        // Test delete
        let delete_result = db.delete_workspace(&workspace_id).await;
        assert!(delete_result.is_ok());
        
        // Verify deletion
        let deleted_check = db.get_workspace(&workspace_id).await.unwrap();
        assert!(deleted_check.is_none());
        
        let empty_workspaces = db.get_all_workspaces().await.unwrap();
        assert_eq!(empty_workspaces.len(), 0);
    }

    #[tokio::test]
    async fn test_active_workspace_management() {
        let db = create_test_database().await;
        
        // Initially no active workspace
        let active = db.get_active_workspace().await.unwrap();
        assert!(active.is_none());
        
        // Create a workspace
        let request = CreateWorkspaceRequest {
            name: "Active Workspace".to_string(),
            description: None,
            workspace_type: WorkspaceType::Local,
            local_path: "/tmp/active-workspace".to_string(),
            git_repository_url: None,
            git_branch: None,
            git_username: None,
            git_email: None,
        };
        
        let workspace = Workspace::new(request);
        let workspace_id = workspace.id.clone();
        
        db.create_workspace(&workspace).await.unwrap();
        
        // Set as active
        let set_active_result = db.set_active_workspace(&workspace_id).await;
        assert!(set_active_result.is_ok());
        
        // Check active workspace
        let active_workspace = db.get_active_workspace().await.unwrap();
        assert!(active_workspace.is_some());
        assert_eq!(active_workspace.unwrap().id, workspace_id);
        
        // Create another workspace
        let request2 = CreateWorkspaceRequest {
            name: "Second Workspace".to_string(),
            description: None,
            workspace_type: WorkspaceType::Local,
            local_path: "/tmp/second-workspace".to_string(),
            git_repository_url: None,
            git_branch: None,
            git_username: None,
            git_email: None,
        };
        
        let workspace2 = Workspace::new(request2);
        let workspace2_id = workspace2.id.clone();
        
        db.create_workspace(&workspace2).await.unwrap();
        
        // Set second workspace as active
        db.set_active_workspace(&workspace2_id).await.unwrap();
        
        // Verify active workspace changed
        let new_active = db.get_active_workspace().await.unwrap();
        assert!(new_active.is_some());
        assert_eq!(new_active.unwrap().id, workspace2_id);
    }

    #[tokio::test]
    async fn test_workspace_summaries() {
        let db = create_test_database().await;
        
        // Create multiple workspaces
        for i in 0..3 {
            let request = CreateWorkspaceRequest {
                name: format!("Workspace {}", i),
                description: Some(format!("Description {}", i)),
                workspace_type: WorkspaceType::Local,
                local_path: format!("/tmp/workspace-{}", i),
                git_repository_url: None,
                git_branch: None,
                git_username: None,
                git_email: None,
            };
            
            let workspace = Workspace::new(request);
            db.create_workspace(&workspace).await.unwrap();
        }
        
        let summaries = db.get_workspace_summaries().await.unwrap();
        assert_eq!(summaries.len(), 3);
        
        // Verify summary structure
        for (i, summary) in summaries.iter().enumerate() {
            assert_eq!(summary.name, format!("Workspace {}", i));
            assert_eq!(summary.description, Some(format!("Description {}", i)));
            assert_eq!(summary.workspace_type, WorkspaceType::Local);
        }
    }

    #[tokio::test]
    async fn test_workspace_settings_crud() {
        let db = create_test_database().await;
        
        // Create workspace first
        let request = CreateWorkspaceRequest {
            name: "Settings Workspace".to_string(),
            description: None,
            workspace_type: WorkspaceType::Local,
            local_path: "/tmp/settings-workspace".to_string(),
            git_repository_url: None,
            git_branch: None,
            git_username: None,
            git_email: None,
        };
        
        let workspace = Workspace::new(request);
        let workspace_id = workspace.id.clone();
        db.create_workspace(&workspace).await.unwrap();
        
        // Create settings
        let mut settings = WorkspaceSettings::default();
        settings.workspace_id = workspace_id.clone();
        settings.auto_save_enabled = true;
        settings.auto_save_interval_seconds = 60;
        
        let create_result = db.create_workspace_settings(&settings).await;
        assert!(create_result.is_ok());
        
        // Get settings
        let retrieved_settings = db.get_workspace_settings(&workspace_id).await.unwrap();
        assert!(retrieved_settings.is_some());
        let retrieved = retrieved_settings.unwrap();
        assert_eq!(retrieved.workspace_id, workspace_id);
        assert!(retrieved.auto_save_enabled);
        assert_eq!(retrieved.auto_save_interval_seconds, 60);
        
        // Update settings
        let mut updated_settings = retrieved;
        updated_settings.auto_save_enabled = false;
        updated_settings.auto_save_interval_seconds = 120;
        
        let update_result = db.update_workspace_settings(&updated_settings).await;
        assert!(update_result.is_ok());
        
        // Verify update
        let final_settings = db.get_workspace_settings(&workspace_id).await.unwrap().unwrap();
        assert!(!final_settings.auto_save_enabled);
        assert_eq!(final_settings.auto_save_interval_seconds, 120);
    }

    #[tokio::test]
    async fn test_database_connection_management() {
        let db = create_test_database().await;
        
        // Test that we can get the connection pool
        let pool = db.get_pool();
        assert!(!pool.is_closed());
        
        // Test multiple concurrent operations
        let workspace1_request = CreateWorkspaceRequest {
            name: "Concurrent 1".to_string(),
            description: None,
            workspace_type: WorkspaceType::Local,
            local_path: "/tmp/concurrent-1".to_string(),
            git_repository_url: None,
            git_branch: None,
            git_username: None,
            git_email: None,
        };
        
        let workspace2_request = CreateWorkspaceRequest {
            name: "Concurrent 2".to_string(),
            description: None,
            workspace_type: WorkspaceType::Local,
            local_path: "/tmp/concurrent-2".to_string(),
            git_repository_url: None,
            git_branch: None,
            git_username: None,
            git_email: None,
        };
        
        let workspace1 = Workspace::new(workspace1_request);
        let workspace2 = Workspace::new(workspace2_request);
        
        // Execute concurrent operations
        let (result1, result2) = tokio::join!(
            db.create_workspace(&workspace1),
            db.create_workspace(&workspace2)
        );
        
        assert!(result1.is_ok());
        assert!(result2.is_ok());
        
        // Verify both workspaces were created
        let all_workspaces = db.get_all_workspaces().await.unwrap();
        assert_eq!(all_workspaces.len(), 2);
    }

    #[tokio::test]
    async fn test_error_handling() {
        let db = create_test_database().await;
        
        // Test getting non-existent workspace
        let non_existent = db.get_workspace("non-existent-id").await.unwrap();
        assert!(non_existent.is_none());
        
        // Test deleting non-existent workspace (should not error)
        let delete_result = db.delete_workspace("non-existent-id").await;
        assert!(delete_result.is_ok());
        
        // Test getting settings for non-existent workspace
        let settings = db.get_workspace_settings("non-existent-id").await.unwrap();
        assert!(settings.is_none());
        
        // Test setting active workspace to non-existent ID
        let set_active_result = db.set_active_workspace("non-existent-id").await;
        // This might succeed or fail depending on implementation, but shouldn't panic
        let _ = set_active_result;
    }

    #[test]
    fn test_workspace_model_creation() {
        let request = CreateWorkspaceRequest {
            name: "Test Model".to_string(),
            description: Some("Test description".to_string()),
            workspace_type: WorkspaceType::Git,
            local_path: "/tmp/test".to_string(),
            git_repository_url: Some("https://github.com/test/repo.git".to_string()),
            git_branch: Some("main".to_string()),
            git_username: Some("testuser".to_string()),
            git_email: Some("test@example.com".to_string()),
        };
        
        let workspace = Workspace::new(request);
        assert_eq!(workspace.name, "Test Model");
        assert_eq!(workspace.description, Some("Test description".to_string()));
        assert_eq!(workspace.workspace_type, WorkspaceType::Git);
        assert_eq!(workspace.git_repository_url, Some("https://github.com/test/repo.git".to_string()));
        assert_eq!(workspace.git_branch, Some("main".to_string()));
        assert!(workspace.is_active);
        assert!(!workspace.id.is_empty());
    }

    #[test]
    fn test_workspace_settings_default() {
        let settings = WorkspaceSettings::default();
        assert!(settings.auto_save_enabled);
        assert_eq!(settings.auto_save_interval_seconds, 30);
        assert_eq!(settings.theme, "system");
        assert!(settings.show_request_body);
        assert!(settings.show_response_headers);
        assert!(!settings.follow_redirects_by_default);
        assert_eq!(settings.default_timeout_ms, 30000);
    }
}