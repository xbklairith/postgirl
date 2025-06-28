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
        assert!(!created_env.is_active);
    }

    #[tokio::test]
    async fn test_environment_list_by_workspace() {
        let db = create_test_database().await;
        let service = EnvironmentService::new(db.clone());
        
        let workspace_id = "test-workspace";
        
        // Create multiple environments
        for i in 0..3 {
            service.create_environment(workspace_id.to_string(), format!("env-{}", i)).await.unwrap();
        }
        
        let environments = service.list_environments(workspace_id).await.unwrap();
        assert_eq!(environments.len(), 3);
    }

    #[tokio::test]
    async fn test_environment_variable_operations() {
        let db = create_test_database().await;
        let service = EnvironmentService::new(db.clone());
        
        // Create environment
        let env = service.create_environment("test-workspace".to_string(), "test-env".to_string()).await.unwrap();
        
        // Add variable
        let variable = EnvironmentVariable {
            key: "API_URL".to_string(),
            value: "https://api.example.com".to_string(),
            is_secret: false,
            variable_type: VariableType::String,
        };

        let updated_env = service.add_variable(&env.id, variable.clone()).await.unwrap();
        assert!(updated_env.variables.contains_key("API_URL"));
        assert_eq!(updated_env.variables["API_URL"].value, "https://api.example.com");

        // Update variable
        let mut updated_variable = variable.clone();
        updated_variable.value = "https://staging.example.com".to_string();
        
        let result = service.update_variable(&env.id, updated_variable).await.unwrap();
        assert_eq!(result.variables["API_URL"].value, "https://staging.example.com");

        // Remove variable
        let result = service.remove_variable(&env.id, "API_URL").await.unwrap();
        assert!(!result.variables.contains_key("API_URL"));
    }

    #[tokio::test]
    async fn test_environment_update() {
        let db = create_test_database().await;
        let service = EnvironmentService::new(db.clone());
        
        // Create environment
        let mut env = service.create_environment("test-workspace".to_string(), "test-env".to_string()).await.unwrap();
        
        // Update environment name
        env.name = "updated-env".to_string();
        
        let updated_env = service.update_environment(env).await.unwrap();
        assert_eq!(updated_env.name, "updated-env");
    }

    #[tokio::test]
    async fn test_environment_deletion() {
        let db = create_test_database().await;
        let service = EnvironmentService::new(db.clone());
        
        // Create environment
        let env = service.create_environment("test-workspace".to_string(), "test-env".to_string()).await.unwrap();
        let env_id = env.id.clone();
        
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
        assert!(!VariableType::Secret.validate_value(""));
        assert!(!VariableType::Secret.validate_value("   "));
        assert!(VariableType::Secret.validate_value("complex-secret-123!@#"));
    }

    #[test]
    fn test_environment_variable_creation() {
        let var = EnvironmentVariable {
            key: "TEST_VAR".to_string(),
            value: "test-value".to_string(),
            variable_type: VariableType::String,
            is_secret: false,
        };
        
        assert_eq!(var.key, "TEST_VAR");
        assert_eq!(var.value, "test-value");
        assert!(!var.is_secret);
        assert!(matches!(var.variable_type, VariableType::String));
    }

    #[tokio::test]
    async fn test_variable_substitution() {
        let db = create_test_database().await;
        let service = EnvironmentService::new(db.clone());
        
        let mut variables = std::collections::HashMap::new();
        variables.insert("API_URL".to_string(), "https://api.example.com".to_string());
        variables.insert("API_KEY".to_string(), "secret-key-123".to_string());
        variables.insert("TIMEOUT".to_string(), "30000".to_string());

        let text = "GET {{API_URL}}/users with key {{API_KEY}} and timeout {{TIMEOUT}}ms";
        let result = service.substitute_variables(text, &variables);
        
        assert_eq!(result, "GET https://api.example.com/users with key secret-key-123 and timeout 30000ms");

        // Test with missing variables (should remain unchanged)
        let text_with_missing = "GET {{API_URL}}/users with missing {{MISSING_VAR}}";
        let result_with_missing = service.substitute_variables(text_with_missing, &variables);
        assert_eq!(result_with_missing, "GET https://api.example.com/users with missing {{MISSING_VAR}}");
    }

    #[tokio::test]
    async fn test_variable_extraction() {
        let db = create_test_database().await;
        let service = EnvironmentService::new(db.clone());
        
        let text = "GET {{API_URL}}/users/{{USER_ID}} with Authorization: Bearer {{API_KEY}}";
        let variables = service.extract_variables(text);
        
        assert_eq!(variables.len(), 3);
        assert!(variables.contains(&"API_URL".to_string()));
        assert!(variables.contains(&"USER_ID".to_string()));
        assert!(variables.contains(&"API_KEY".to_string()));

        // Test with no variables
        let text_no_vars = "GET https://api.example.com/users";
        let no_variables = service.extract_variables(text_no_vars);
        assert!(no_variables.is_empty());

        // Test with duplicate variables
        let text_duplicates = "{{API_URL}}/{{API_URL}}/{{USER_ID}}";
        let duplicate_variables = service.extract_variables(text_duplicates);
        assert_eq!(duplicate_variables.len(), 2); // Should deduplicate
    }
}