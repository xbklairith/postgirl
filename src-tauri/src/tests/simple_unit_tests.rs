#[cfg(test)]
mod tests {
    use crate::models::workspace::*;
    use crate::models::environment::*;
    use crate::models::collection::*;
    use crate::services::git_service::GitService;
    use tempfile::TempDir;

    #[test]
    fn test_workspace_creation() {
        let request = CreateWorkspaceRequest {
            name: "Test Workspace".to_string(),
            description: Some("Test description".to_string()),
            git_repository_url: None,
            local_path: "/tmp/test".to_string(),
        };
        
        let workspace = Workspace::new(request);
        assert_eq!(workspace.name, "Test Workspace");
        assert_eq!(workspace.description, Some("Test description".to_string()));
        assert!(!workspace.is_active);
        assert!(!workspace.id.is_empty());
    }

    #[test]
    fn test_workspace_update() {
        let request = CreateWorkspaceRequest {
            name: "Original".to_string(),
            description: None,
            git_repository_url: None,
            local_path: "/tmp/test".to_string(),
        };
        
        let mut workspace = Workspace::new(request);
        let original_updated_at = workspace.updated_at;
        
        std::thread::sleep(std::time::Duration::from_millis(1));
        
        let update_request = UpdateWorkspaceRequest {
            id: workspace.id.clone(),
            name: Some("Updated".to_string()),
            description: Some("Updated description".to_string()),
            git_repository_url: None,
            local_path: None,
            is_active: Some(true),
        };
        
        workspace.update(update_request);
        assert_eq!(workspace.name, "Updated");
        assert_eq!(workspace.description, Some("Updated description".to_string()));
        assert!(workspace.is_active);
        assert!(workspace.updated_at > original_updated_at);
    }

    #[test]
    fn test_workspace_access() {
        let request = CreateWorkspaceRequest {
            name: "Test".to_string(),
            description: None,
            git_repository_url: None,
            local_path: "/tmp/test".to_string(),
        };
        
        let mut workspace = Workspace::new(request);
        assert!(workspace.last_accessed_at.is_none());
        
        workspace.access();
        assert!(workspace.last_accessed_at.is_some());
    }

    #[test]
    fn test_workspace_settings_default() {
        let settings = WorkspaceSettings::default();
        assert!(settings.auto_save);
        assert!(settings.sync_on_startup);
        assert_eq!(settings.default_timeout, 30000);
        assert!(settings.follow_redirects);
        assert!(settings.verify_ssl);
    }

    #[test]
    fn test_environment_variable_creation() {
        let var = EnvironmentVariable {
            key: "API_URL".to_string(),
            value: "https://api.example.com".to_string(),
            is_secret: false,
            variable_type: VariableType::String,
        };
        
        assert_eq!(var.key, "API_URL");
        assert_eq!(var.value, "https://api.example.com");
        assert!(!var.is_secret);
        assert!(matches!(var.variable_type, VariableType::String));
    }

    #[test]
    fn test_variable_type_validation() {
        assert!(VariableType::String.validate_value("any string"));
        assert!(VariableType::String.validate_value(""));
        
        assert!(VariableType::Secret.validate_value("secret value"));
        assert!(!VariableType::Secret.validate_value(""));
        assert!(!VariableType::Secret.validate_value("   "));
    }

    #[test]
    fn test_variable_type_conversion() {
        assert_eq!(VariableType::String.as_str(), "string");
        assert_eq!(VariableType::Secret.as_str(), "secret");
        
        assert!(matches!(VariableType::from_str("string"), VariableType::String));
        assert!(matches!(VariableType::from_str("secret"), VariableType::Secret));
        assert!(matches!(VariableType::from_str("unknown"), VariableType::String));
    }

    #[test]
    fn test_environment_default() {
        let env = Environment::default();
        assert_eq!(env.name, "Development");
        assert!(env.is_active);
        assert!(env.variables.is_empty());
        assert!(!env.id.is_empty());
    }

    #[test]
    fn test_collection_creation() {
        let request = CreateCollectionRequest {
            workspace_id: "workspace-1".to_string(),
            name: "API Tests".to_string(),
            description: Some("Collection of API tests".to_string()),
            folder_path: Some("api".to_string()),
            git_branch: Some("main".to_string()),
        };
        
        let collection = Collection::new(request);
        assert_eq!(collection.name, "API Tests");
        assert_eq!(collection.workspace_id, "workspace-1");
        assert_eq!(collection.description, Some("Collection of API tests".to_string()));
        assert_eq!(collection.folder_path, Some("api".to_string()));
        assert_eq!(collection.git_branch, Some("main".to_string()));
        assert!(!collection.is_active);
        assert!(!collection.id.is_empty());
    }

    #[test]
    fn test_collection_update() {
        let request = CreateCollectionRequest {
            workspace_id: "workspace-1".to_string(),
            name: "Original".to_string(),
            description: None,
            folder_path: None,
            git_branch: None,
        };
        
        let mut collection = Collection::new(request);
        let original_updated_at = collection.updated_at;
        
        std::thread::sleep(std::time::Duration::from_millis(1));
        
        let update_request = UpdateCollectionRequest {
            id: collection.id.clone(),
            name: Some("Updated".to_string()),
            description: Some("Updated description".to_string()),
            folder_path: Some("updated".to_string()),
            git_branch: Some("feature".to_string()),
            is_active: Some(true),
        };
        
        collection.update(update_request);
        assert_eq!(collection.name, "Updated");
        assert_eq!(collection.description, Some("Updated description".to_string()));
        assert_eq!(collection.folder_path, Some("updated".to_string()));
        assert_eq!(collection.git_branch, Some("feature".to_string()));
        assert!(collection.is_active);
        assert!(collection.updated_at > original_updated_at);
    }

    #[test]
    fn test_request_creation() {
        let request = CreateRequestRequest {
            collection_id: "collection-1".to_string(),
            name: "Get Users".to_string(),
            description: Some("Fetch all users".to_string()),
            method: "GET".to_string(),
            url: "https://api.example.com/users".to_string(),
            headers: Some(serde_json::json!({"Authorization": "Bearer token"})),
            body: None,
            body_type: Some("json".to_string()),
            auth_type: Some("bearer".to_string()),
            auth_config: Some(serde_json::json!({"token": "secret"})),
            follow_redirects: Some(true),
            timeout_ms: Some(5000),
            order_index: Some(1),
        };
        
        let http_request = Request::new(request);
        assert_eq!(http_request.name, "Get Users");
        assert_eq!(http_request.collection_id, "collection-1");
        assert_eq!(http_request.method, "GET");
        assert_eq!(http_request.url, "https://api.example.com/users");
        assert_eq!(http_request.body_type, "json");
        assert_eq!(http_request.auth_type, Some("bearer".to_string()));
        assert!(http_request.follow_redirects);
        assert_eq!(http_request.timeout_ms, 5000);
        assert_eq!(http_request.order_index, 1);
    }

    #[test]
    fn test_request_header_parsing() {
        let request = CreateRequestRequest {
            collection_id: "collection-1".to_string(),
            name: "Test".to_string(),
            description: None,
            method: "GET".to_string(),
            url: "https://api.example.com".to_string(),
            headers: Some(serde_json::json!({"Content-Type": "application/json"})),
            body: None,
            body_type: None,
            auth_type: None,
            auth_config: None,
            follow_redirects: None,
            timeout_ms: None,
            order_index: None,
        };
        
        let http_request = Request::new(request);
        let headers = http_request.get_headers().unwrap();
        assert_eq!(headers["Content-Type"], "application/json");
    }

    #[test]
    fn test_git_service_creation() {
        let service = GitService::new();
        // Just test that we can create the service without errors
        assert!(true);
    }

    #[test]
    fn test_git_repository_initialization() {
        let service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        let result = service.initialize_repository(repo_path);
        assert!(result.is_ok());
        
        let clone_result = result.unwrap();
        assert!(clone_result.success);
        assert_eq!(clone_result.path, repo_path);
    }

    #[test]
    fn test_git_repository_exists_check() {
        let service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Should not exist before initialization
        assert!(!service.check_repository_exists(repo_path));

        // Initialize repository
        service.initialize_repository(repo_path).unwrap();

        // Should exist after initialization
        assert!(service.check_repository_exists(repo_path));
    }
}