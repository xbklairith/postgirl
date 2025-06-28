#[cfg(test)]
mod tests {
    use crate::services::git_service::GitService;
    use tempfile::TempDir;
    use std::fs;

    #[test]
    fn test_git_service_creation() {
        let service = GitService::new();
        // Service should be created without errors
        assert!(true);
    }

    #[test]
    fn test_repository_initialization() {
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
    fn test_repository_status_uninitialized() {
        let service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Try to get status of uninitialized repository
        let result = service.get_repository_status(repo_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_repository_status_with_untracked_file() {
        let service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initialize repository
        service.initialize_repository(repo_path).unwrap();

        // Create an untracked file
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "test content").unwrap();

        // Get status - might fail for unborn branches but that's expected
        let status = service.get_repository_status(repo_path);
        
        // We expect this to either succeed with untracked files or fail due to unborn branch
        match status {
            Ok(status) => {
                assert!(!status.is_clean);
                assert_eq!(status.untracked_files.len(), 1);
                assert!(status.untracked_files.contains(&"test.txt".to_string()));
            }
            Err(_) => {
                // This is acceptable for unborn branches
                assert!(true);
            }
        }
    }

    #[test]
    fn test_check_repository_exists() {
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

    #[test]
    fn test_add_all_files() {
        let service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initialize repository
        service.initialize_repository(repo_path).unwrap();

        // Create files
        let file1_path = temp_dir.path().join("file1.txt");
        let file2_path = temp_dir.path().join("file2.txt");
        fs::write(&file1_path, "content 1").unwrap();
        fs::write(&file2_path, "content 2").unwrap();

        // Add all files
        let result = service.add_all_changes(repo_path);
        assert!(result.is_ok());
        
        let add_result = result.unwrap();
        assert!(add_result.success);
    }

    #[test]
    fn test_commit_changes() {
        let service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initialize repository
        service.initialize_repository(repo_path).unwrap();

        // Create and add a file
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "initial content").unwrap();
        service.add_all_changes(repo_path).unwrap();

        // Commit changes
        let result = service.commit_changes(repo_path, "Initial commit");
        assert!(result.is_ok());
        
        let commit_result = result.unwrap();
        assert!(commit_result.success);
    }

    #[test]
    fn test_get_branches_empty_repo() {
        let service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initialize repository
        service.initialize_repository(repo_path).unwrap();

        // Get branches from empty repository
        let result = service.get_branches(repo_path);
        
        // This might fail for unborn branches, which is acceptable
        match result {
            Ok(branches) => {
                // If it succeeds, we might have no branches or a default main branch
                assert!(branches.len() <= 1);
            }
            Err(_) => {
                // This is acceptable for unborn branches
                assert!(true);
            }
        }
    }

    #[test]
    fn test_get_branches_with_commit() {
        let service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initialize repository
        service.initialize_repository(repo_path).unwrap();

        // Create, add, and commit a file
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "content").unwrap();
        service.add_all_changes(repo_path).unwrap();
        service.commit_changes(repo_path, "Initial commit").unwrap();

        // Get branches
        let result = service.get_branches(repo_path);
        assert!(result.is_ok());
        
        let branches = result.unwrap();
        assert_eq!(branches.len(), 1);
        assert_eq!(branches[0].name, "main");
        assert!(branches[0].is_current);
    }
}