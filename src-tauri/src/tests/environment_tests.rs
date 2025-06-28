#[cfg(test)]
mod tests {
    use crate::models::environment::*;
    use crate::services::environment_service::EnvironmentService;
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
    async fn test_environment_creation() {
        let db = create_test_database().await;
        let service = EnvironmentService::new(db.clone());
        
        let result = service.create_environment("test-workspace".to_string(), "test-env".to_string()).await;
        assert!(result.is_ok());
        
        let created_env = result.unwrap();
        assert_eq!(created_env.name, "test-env");
        assert_eq!(created_env.variables.len(), 0);
    }

    #[tokio::test]
    async fn test_environment_list_by_workspace() {
        let db = create_test_database().await;
        let service = EnvironmentService::new(db.clone());
        
        let workspace_id = "test-workspace";
        
        // Create multiple environments
        for i in 0..3 {
            let env = CreateEnvironmentRequest {
                workspace_id: workspace_id.to_string(),
                name: format!("env-{}", i),
                description: Some(format!("Environment {}", i)),
                variables: vec![],
            };
            
            service.create_environment(env).await.unwrap();
        }
        
        let environments = service.list_environments(workspace_id).await.unwrap();
        assert_eq!(environments.len(), 3);
    }

    #[tokio::test]
    async fn test_environment_update() {
        let db = create_test_database().await;
        let service = EnvironmentService::new(db.clone());
        
        // Create environment
        let env = CreateEnvironmentRequest {
            workspace_id: "test-workspace".to_string(),
            name: "test-env".to_string(),
            description: Some("Original description".to_string()),
            variables: vec![
                EnvironmentVariable {
                    name: "VAR1".to_string(),
                    value: "value1".to_string(),
                    variable_type: VariableType::String,
                    is_secret: false,
                },
            ],
        };

        let mut created_env = service.create_environment(env).await.unwrap();
        
        // Update environment
        created_env.description = Some("Updated description".to_string());
        created_env.variables.push(EnvironmentVariable {
            name: "VAR2".to_string(),
            value: "value2".to_string(),
            variable_type: VariableType::String,
            is_secret: false,
        });
        
        let updated_env = service.update_environment(created_env).await.unwrap();
        assert_eq!(updated_env.description, Some("Updated description".to_string()));
        assert_eq!(updated_env.variables.len(), 2);
    }

    #[tokio::test]
    async fn test_environment_deletion() {
        let db = create_test_database().await;
        let service = EnvironmentService::new(db.clone());
        
        // Create environment
        let env = CreateEnvironmentRequest {
            workspace_id: "test-workspace".to_string(),
            name: "test-env".to_string(),
            description: None,
            variables: vec![],
        };

        let created_env = service.create_environment(env).await.unwrap();
        let env_id = created_env.id.clone();
        
        // Delete environment
        let result = service.delete_environment(&env_id).await;
        assert!(result.is_ok());
        
        // Verify deletion
        let environments = service.list_environments("test-workspace").await.unwrap();
        assert!(environments.is_empty());
    }

    #[test]
    fn test_variable_type_validation() {
        // Test VariableType::String
        assert!(VariableType::String.validate_value("regular string"));
        assert!(VariableType::String.validate_value("123"));
        assert!(VariableType::String.validate_value(""));
        
        // Test VariableType::Secret
        assert!(VariableType::Secret.validate_value("secret-value"));
        assert!(VariableType::Secret.validate_value(""));
        assert!(VariableType::Secret.validate_value("complex-secret-123!@#"));
    }

    #[test]
    fn test_environment_variable_creation() {
        let var = EnvironmentVariable {
            name: "TEST_VAR".to_string(),
            value: "test-value".to_string(),
            variable_type: VariableType::String,
            is_secret: false,
        };
        
        assert_eq!(var.name, "TEST_VAR");
        assert_eq!(var.value, "test-value");
        assert!(!var.is_secret);
        assert!(matches!(var.variable_type, VariableType::String));
    }
}