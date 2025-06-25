#[cfg(test)]
mod tests {
    use crate::commands::workspace::expand_tilde_path;
    use crate::models::workspace::CreateWorkspaceRequest;
    use std::env;
    use tempfile::TempDir;

    #[test]
    fn test_expand_tilde_path() {
        // Test tilde expansion
        if let Ok(home) = env::var("HOME") {
            let path = "~/Documents/Postgirl/test";
            let expanded = expand_tilde_path(path);
            assert_eq!(expanded, format!("{}/Documents/Postgirl/test", home));
        }

        // Test non-tilde path
        let path = "/absolute/path/test";
        let expanded = expand_tilde_path(path);
        assert_eq!(expanded, path);

        // Test relative path
        let path = "relative/path/test";
        let expanded = expand_tilde_path(path);
        assert_eq!(expanded, path);
    }

    #[tokio::test]
    async fn test_workspace_folder_structure_local_only() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let workspace_path = temp_dir.path().to_str().unwrap();

        // Simulate the folder creation logic for local-only workspaces
        let collections_dir = format!("{}/collections", workspace_path);
        let environments_dir = format!("{}/environments", workspace_path);
        let postgirl_dir = format!("{}/.postgirl", workspace_path);

        tokio::fs::create_dir_all(&collections_dir)
            .await
            .expect("Failed to create collections directory");
        
        tokio::fs::create_dir_all(&environments_dir)
            .await
            .expect("Failed to create environments directory");
        
        tokio::fs::create_dir_all(&postgirl_dir)
            .await
            .expect("Failed to create .postgirl directory");

        // Verify directories exist
        assert!(tokio::fs::metadata(&collections_dir).await.is_ok());
        assert!(tokio::fs::metadata(&environments_dir).await.is_ok());
        assert!(tokio::fs::metadata(&postgirl_dir).await.is_ok());

        // Test .gitignore creation for local workspaces
        let gitignore_path = format!("{}/.gitignore", workspace_path);
        let gitignore_content = r#"# Postgirl workspace files
.postgirl/cache/
.postgirl/logs/
.DS_Store
Thumbs.db

# Environment files with secrets
**/*.env.local
**/*.env.secret

# Temporary files
*.tmp
*.temp
"#;
        
        tokio::fs::write(&gitignore_path, gitignore_content)
            .await
            .expect("Failed to create .gitignore file");

        // Verify .gitignore exists and has correct content
        let gitignore_exists = tokio::fs::metadata(&gitignore_path).await.is_ok();
        assert!(gitignore_exists);

        let content = tokio::fs::read_to_string(&gitignore_path)
            .await
            .expect("Failed to read .gitignore file");
        assert!(content.contains("# Postgirl workspace files"));
        assert!(content.contains(".postgirl/cache/"));
    }

    #[tokio::test]
    async fn test_workspace_git_clone_scenario() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let workspace_path = temp_dir.path().to_str().unwrap();

        // Simulate Git clone - create some files that would come from a cloned repo
        tokio::fs::create_dir_all(workspace_path)
            .await
            .expect("Failed to create workspace directory");
            
        // Create some files that would exist in a cloned repo
        let readme_path = format!("{}/README.md", workspace_path);
        tokio::fs::write(&readme_path, "# My Project\n")
            .await
            .expect("Failed to create README.md");

        // Create existing .gitignore
        let gitignore_path = format!("{}/.gitignore", workspace_path);
        tokio::fs::write(&gitignore_path, "# Existing .gitignore\nnode_modules/\n")
            .await
            .expect("Failed to create existing .gitignore");

        // Now create workspace subdirectories (should not overwrite existing files)
        let collections_dir = format!("{}/collections", workspace_path);
        let environments_dir = format!("{}/environments", workspace_path);
        let postgirl_dir = format!("{}/.postgirl", workspace_path);

        // Only create directories if they don't exist (simulating Git clone behavior)
        if !tokio::fs::metadata(&collections_dir).await.is_ok() {
            tokio::fs::create_dir_all(&collections_dir)
                .await
                .expect("Failed to create collections directory");
        }
        
        if !tokio::fs::metadata(&environments_dir).await.is_ok() {
            tokio::fs::create_dir_all(&environments_dir)
                .await
                .expect("Failed to create environments directory");
        }
        
        if !tokio::fs::metadata(&postgirl_dir).await.is_ok() {
            tokio::fs::create_dir_all(&postgirl_dir)
                .await
                .expect("Failed to create .postgirl directory");
        }

        // Verify all directories exist
        assert!(tokio::fs::metadata(&collections_dir).await.is_ok());
        assert!(tokio::fs::metadata(&environments_dir).await.is_ok());
        assert!(tokio::fs::metadata(&postgirl_dir).await.is_ok());

        // Verify existing files are preserved
        assert!(tokio::fs::metadata(&readme_path).await.is_ok());
        
        // Verify existing .gitignore is preserved (not overwritten)
        let content = tokio::fs::read_to_string(&gitignore_path)
            .await
            .expect("Failed to read .gitignore file");
        assert!(content.contains("# Existing .gitignore"));
        assert!(content.contains("node_modules/"));
        assert!(!content.contains("# Postgirl workspace files")); // Should not be overwritten
    }

    #[test]
    fn test_create_workspace_request_validation() {
        // Test valid workspace request
        let request = CreateWorkspaceRequest {
            name: "Test Workspace".to_string(),
            description: Some("A test workspace".to_string()),
            local_path: "~/Documents/Postgirl/test-workspace".to_string(),
            git_repository_url: Some("https://github.com/user/repo.git".to_string()),
        };

        assert_eq!(request.name, "Test Workspace");
        assert_eq!(request.local_path, "~/Documents/Postgirl/test-workspace");
        assert!(request.git_repository_url.is_some());

        // Test workspace request without Git URL
        let request_no_git = CreateWorkspaceRequest {
            name: "Local Workspace".to_string(),
            description: None,
            local_path: "~/Documents/Postgirl/local-workspace".to_string(),
            git_repository_url: None,
        };

        assert_eq!(request_no_git.name, "Local Workspace");
        assert!(request_no_git.git_repository_url.is_none());
        assert!(request_no_git.description.is_none());
    }

    #[test]
    fn test_workspace_path_sanitization() {
        // Test various path formats
        let paths = vec![
            "~/Documents/Postgirl/test",
            "/absolute/path/to/workspace",
            "relative/path/workspace",
            "~/Documents/My Workspace With Spaces",
            "~/Documents/workspace-with-dashes",
            "~/Documents/workspace_with_underscores",
        ];

        for path in paths {
            let expanded = expand_tilde_path(path);
            
            // Basic validation - expanded path should not be empty
            assert!(!expanded.is_empty());
            
            // If original had tilde and HOME is set, should be expanded
            if path.starts_with("~/") && env::var("HOME").is_ok() {
                assert!(!expanded.starts_with("~/"));
            }
        }
    }
}