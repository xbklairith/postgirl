#[cfg(test)]
mod tests {
    use crate::services::environment_service::EnvironmentService;
    use crate::models::environment::*;
    use std::collections::HashMap;

    #[tokio::test]
    async fn test_environment_service_creation() {
        let service = EnvironmentService::new();
        // Service should be created without errors
        assert!(true);
    }

    #[tokio::test]
    async fn test_create_environment() {
        let service = EnvironmentService::new();
        let workspace_id = "test-workspace".to_string();
        let name = "Test Environment".to_string();

        let environment = service.create_environment(workspace_id, name.clone()).await;
        
        assert!(environment.is_ok());
        let env = environment.unwrap();
        assert_eq!(env.name, name);
        assert!(!env.is_active);
        assert!(env.variables.is_empty());
    }

    #[tokio::test]
    async fn test_environment_variable_operations() {
        let service = EnvironmentService::new();
        let workspace_id = "test-workspace".to_string();
        
        // Create environment
        let env = service.create_environment(workspace_id, "Test Env".to_string()).await.unwrap();
        
        // Add variable
        let variable = EnvironmentVariable {
            key: "API_URL".to_string(),
            value: "https://api.example.com".to_string(),
            is_secret: false,
            variable_type: VariableType::String,
        };

        let updated_env = service.add_variable(&env.id, variable.clone()).await;
        assert!(updated_env.is_ok());
        
        let env_with_var = updated_env.unwrap();
        assert!(env_with_var.variables.contains_key("API_URL"));
        assert_eq!(env_with_var.variables["API_URL"].value, "https://api.example.com");

        // Update variable
        let mut updated_variable = variable.clone();
        updated_variable.value = "https://staging.example.com".to_string();
        
        let result = service.update_variable(&env.id, updated_variable).await;
        assert!(result.is_ok());
        
        let env_updated = result.unwrap();
        assert_eq!(env_updated.variables["API_URL"].value, "https://staging.example.com");

        // Remove variable
        let result = service.remove_variable(&env.id, "API_URL").await;
        assert!(result.is_ok());
        
        let env_removed = result.unwrap();
        assert!(!env_removed.variables.contains_key("API_URL"));
    }

    #[tokio::test]
    async fn test_environment_schema_creation() {
        let service = EnvironmentService::new();
        let workspace_id = "test-workspace".to_string();
        let name = "Test Schema".to_string();
        
        let schema = service.create_schema(workspace_id.clone(), name.clone()).await;
        
        assert!(schema.is_ok());
        let schema = schema.unwrap();
        assert_eq!(schema.name, name);
        assert_eq!(schema.workspace_id, workspace_id);
        assert_eq!(schema.version, "1.0.0");
        assert!(schema.required_variables.is_empty());
        assert!(schema.optional_variables.is_empty());
    }

    #[tokio::test]
    async fn test_variable_type_validation() {
        // Test string type (always valid)
        assert!(VariableType::String.validate_value("any string"));
        assert!(VariableType::String.validate_value(""));

        // Test secret type (must not be empty when trimmed)
        assert!(VariableType::Secret.validate_value("secret value"));
        assert!(!VariableType::Secret.validate_value(""));
        assert!(!VariableType::Secret.validate_value("   "));

    }

    #[tokio::test]
    async fn test_schema_variable_validation() {
        let schema_var = SchemaVariable {
            key: "API_URL".to_string(),
            variable_type: VariableType::String,
            default_value: None,
            is_required: true,
            is_secret: false,
            validation_pattern: None,
            min_length: Some(10),
            max_length: Some(100),
        };

        // Valid string with correct length
        assert!(schema_var.validate_value("https://api.example.com").is_ok());

        // Valid string (string type accepts any content)
        assert!(schema_var.validate_value("any string value").is_ok());

        // Too short
        assert!(schema_var.validate_value("http://a").is_err());

        // Empty value for required field
        assert!(schema_var.validate_value("").is_err());

        // Test optional field
        let optional_var = SchemaVariable {
            key: "OPTIONAL".to_string(),
            variable_type: VariableType::String,
            description: None,
            default_value: None,
            is_required: false,
            validation_pattern: None,
            min_length: None,
            max_length: None,
        };

        // Empty value should be OK for optional field
        assert!(optional_var.validate_value("").is_ok());
    }

    #[tokio::test]
    async fn test_environment_comparison() {
        let service = EnvironmentService::new();
        let workspace_id = "test-workspace".to_string();

        // Create two environments
        let env1 = service.create_environment(workspace_id.clone(), "Environment 1".to_string()).await.unwrap();
        let env2 = service.create_environment(workspace_id, "Environment 2".to_string()).await.unwrap();

        // Add variables to first environment
        let var1 = EnvironmentVariable {
            key: "API_URL".to_string(),
            value: "https://api.example.com".to_string(),
            is_secret: false,
            variable_type: VariableType::String,
        };

        let var2 = EnvironmentVariable {
            key: "DEBUG_MODE".to_string(),
            value: "true".to_string(),
            is_secret: false,
            variable_type: VariableType::String,
        };

        service.add_variable(&env1.id, var1).await.unwrap();
        service.add_variable(&env1.id, var2).await.unwrap();

        // Add different variables to second environment
        let var3 = EnvironmentVariable {
            key: "API_URL".to_string(),
            value: "https://staging.example.com".to_string(), // Different value
            is_secret: false,
            variable_type: VariableType::String,
        };

        let var4 = EnvironmentVariable {
            key: "NEW_VARIABLE".to_string(),
            value: "new value".to_string(), // Added variable
            is_secret: false,
            variable_type: VariableType::String,
        };

        service.add_variable(&env2.id, var3).await.unwrap();
        service.add_variable(&env2.id, var4).await.unwrap();

        // Compare environments
        let comparison = service.compare_environments(&env1.id, &env2.id).await;
        assert!(comparison.is_ok());

        let comp = comparison.unwrap();
        assert_eq!(comp.summary.total_variables, 3); // API_URL, DEBUG_MODE, NEW_VARIABLE
        assert_eq!(comp.summary.modified_count, 1); // API_URL modified
        assert_eq!(comp.summary.added_count, 1); // NEW_VARIABLE added
        assert_eq!(comp.summary.removed_count, 1); // DEBUG_MODE removed
        assert_eq!(comp.differences.len(), 3);
    }

    #[tokio::test]
    async fn test_environment_consistency_check() {
        let service = EnvironmentService::new();
        let workspace_id = "test-workspace".to_string();

        // Create two environments
        let env1 = service.create_environment(workspace_id.clone(), "Environment 1".to_string()).await.unwrap();
        let env2 = service.create_environment(workspace_id, "Environment 2".to_string()).await.unwrap();

        // Add same variable to both environments
        let var1 = EnvironmentVariable {
            key: "API_URL".to_string(),
            value: "https://api.example.com".to_string(),
            is_secret: false,
            variable_type: VariableType::String,
        };

        let var2 = EnvironmentVariable {
            key: "API_URL".to_string(),
            value: "https://staging.example.com".to_string(),
            is_secret: false,
            variable_type: VariableType::String, // Same type
        };

        service.add_variable(&env1.id, var1).await.unwrap();
        service.add_variable(&env2.id, var2).await.unwrap();

        // Add variable only to first environment (should cause consistency error)
        let var3 = EnvironmentVariable {
            key: "DEBUG_MODE".to_string(),
            value: "true".to_string(),
            is_secret: false,
            variable_type: VariableType::String,
        };

        service.add_variable(&env1.id, var3).await.unwrap();

        // Check consistency
        let result = service.check_consistency(vec![env1.id.clone(), env2.id.clone()]).await;
        assert!(result.is_ok());

        let validation = result.unwrap();
        assert!(!validation.is_valid); // Should have errors due to inconsistency
        assert!(!validation.errors.is_empty()); // Should have at least one error for missing DEBUG_MODE
    }

    #[tokio::test]
    async fn test_variable_substitution() {
        let service = EnvironmentService::new();
        
        let mut variables = HashMap::new();
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
        let service = EnvironmentService::new();
        
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

    #[tokio::test]
    async fn test_environment_validation_against_schema() {
        let service = EnvironmentService::new();
        let workspace_id = "test-workspace".to_string();

        // Create environment
        let env = service.create_environment(workspace_id.clone(), "Test Environment".to_string()).await.unwrap();

        // Create schema with required variables
        let mut schema = service.create_schema(workspace_id, "Test Schema".to_string()).await.unwrap();
        
        schema.required_variables = vec![
            SchemaVariable {
                key: "API_URL".to_string(),
                variable_type: VariableType::String,
                default_value: None,
                is_required: true,
                is_secret: false,
                validation_pattern: None,
                min_length: Some(10),
                max_length: None,
            }
        ];

        schema.optional_variables = vec![
            SchemaVariable {
                key: "DEBUG_MODE".to_string(),
                variable_type: VariableType::String,
                default_value: Some("false".to_string()),
                is_required: false,
                is_secret: false,
                validation_pattern: None,
                min_length: None,
                max_length: None,
            }
        ];

        // Update schema
        let updated_schema = service.update_schema(schema).await.unwrap();

        // Validate environment without required variable (should fail)
        let validation1 = service.validate_environment(&env.id, &updated_schema.id).await;
        assert!(validation1.is_ok());
        let result1 = validation1.unwrap();
        assert!(!result1.is_valid);
        assert!(!result1.errors.is_empty());

        // Add required variable
        let required_var = EnvironmentVariable {
            key: "API_URL".to_string(),
            value: "https://api.example.com".to_string(),
            is_secret: false,
            variable_type: VariableType::String,
        };

        service.add_variable(&env.id, required_var).await.unwrap();

        // Validate again (should pass)
        let validation2 = service.validate_environment(&env.id, &updated_schema.id).await;
        assert!(validation2.is_ok());
        let result2 = validation2.unwrap();
        assert!(result2.is_valid);
        assert!(result2.errors.is_empty());
    }
}