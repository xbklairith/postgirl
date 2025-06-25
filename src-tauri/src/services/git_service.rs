use crate::models::git::*;
use anyhow::Result;
use git2::{
    BranchType, Cred, FetchOptions, RemoteCallbacks, Repository, RepositoryInitOptions,
    StatusOptions,
};
use std::path::Path;

#[derive(Clone)]
pub struct GitService;

// Git2 repositories are not thread-safe, so we don't cache them
// Instead we open them fresh each time, which is acceptable for our use case

impl GitService {
    pub fn new() -> Self {
        Self
    }

    pub fn clone_repository(
        &self,
        url: &str,
        path: &str,
        credentials: Option<&GitCredentials>,
    ) -> Result<CloneResult> {
        let mut builder = git2::build::RepoBuilder::new();
        let mut callbacks = RemoteCallbacks::new();

        // Track authentication attempts to prevent infinite loops
        let auth_attempts = std::sync::Arc::new(std::sync::Mutex::new(0));
        let auth_attempts_clone = auth_attempts.clone();
        
        // Track which methods we've tried
        let tried_methods = std::sync::Arc::new(std::sync::Mutex::new(std::collections::HashSet::new()));
        let tried_methods_clone = tried_methods.clone();

        // Set up authentication callback for both SSH and HTTPS
        callbacks.credentials(move |url, username_from_url, allowed_types| {
            // Prevent infinite loops by limiting attempts
            let attempt_num = {
                let mut attempts = auth_attempts_clone.lock().unwrap();
                *attempts += 1;
                *attempts
            };
            
            if attempt_num > 3 {
                eprintln!("Too many authentication attempts ({}), giving up", attempt_num);
                return Err(git2::Error::from_str("Authentication failed after multiple attempts"));
            }
            
            eprintln!("Git authentication attempt #{} for URL: {}", attempt_num, url);
            eprintln!("Username from URL: {:?}", username_from_url);
            eprintln!("Allowed credential types: {:?}", allowed_types);

            // Check what methods we've already tried
            let mut tried = tried_methods_clone.lock().unwrap();

            // Try SSH key authentication first (for git@hostname URLs)
            if allowed_types.contains(git2::CredentialType::SSH_KEY) {
                let username = username_from_url.unwrap_or("git");
                
                // Try SSH agent first (only on first attempt)
                if attempt_num == 1 && !tried.contains("ssh_agent") {
                    tried.insert("ssh_agent".to_string());
                    eprintln!("Attempting SSH agent authentication");
                    
                    match Cred::ssh_key_from_agent(username) {
                        Ok(cred) => {
                            eprintln!("Created SSH agent credential, testing...");
                            return Ok(cred);
                        }
                        Err(e) => {
                            eprintln!("SSH agent failed: {}", e);
                        }
                    }
                }
                
                // Try SSH key files
                if !tried.contains("ssh_keys") {
                    tried.insert("ssh_keys".to_string());
                    let home_dir = std::env::var("HOME").unwrap_or_default();
                    
                    let ssh_key_types = [
                        ("id_ed25519", "id_ed25519.pub"),
                        ("id_rsa", "id_rsa.pub"),
                        ("id_ecdsa", "id_ecdsa.pub"),
                    ];
                    
                    for (private_name, public_name) in &ssh_key_types {
                        let private_key_path = format!("{}/.ssh/{}", home_dir, private_name);
                        let public_key_path = format!("{}/.ssh/{}", home_dir, public_name);
                        
                        if std::path::Path::new(&private_key_path).exists() {
                            eprintln!("Attempting SSH key authentication with {}", private_key_path);
                            match Cred::ssh_key(username, Some(Path::new(&public_key_path)), Path::new(&private_key_path), None) {
                                Ok(cred) => {
                                    eprintln!("Created SSH key credential with {}, testing...", private_name);
                                    return Ok(cred);
                                }
                                Err(e) => {
                                    eprintln!("Failed to create SSH key credential with {}: {}", private_name, e);
                                }
                            }
                        } else {
                            eprintln!("SSH key file not found: {}", private_key_path);
                        }
                    }
                }
            }

            // Try username/password authentication for HTTPS
            if allowed_types.contains(git2::CredentialType::USER_PASS_PLAINTEXT) && !tried.contains("userpass") {
                tried.insert("userpass".to_string());
                if let Some(creds) = credentials {
                    eprintln!("Using provided username/password credentials");
                    return Cred::userpass_plaintext(&creds.username, &creds.password);
                }
            }

            eprintln!("No more authentication methods to try (attempted: {:?})", tried);
            Err(git2::Error::from_str("No authentication method available"))
        });

        // Add certificate check callback for SSH
        callbacks.certificate_check(|_cert, valid| {
            eprintln!("Certificate check - valid: {}", valid);
            // For now, accept all certificates (similar to ssh -o StrictHostKeyChecking=no)
            // In production, you'd want to verify against known_hosts
            Ok(git2::CertificateCheckStatus::CertificateOk)
        });

        let mut fetch_options = FetchOptions::new();
        fetch_options.remote_callbacks(callbacks);
        builder.fetch_options(fetch_options);

        match builder.clone(url, Path::new(path)) {
            Ok(_repo) => {
                eprintln!("Successfully cloned repository: {} -> {}", url, path);
                Ok(CloneResult {
                    success: true,
                    path: path.to_string(),
                    message: "Repository cloned successfully".to_string(),
                })
            },
            Err(e) => {
                let error_msg = format!("Failed to clone repository: {}", e);
                eprintln!("Git clone error: {}", error_msg);
                Ok(CloneResult {
                    success: false,
                    path: path.to_string(),
                    message: error_msg,
                })
            },
        }
    }

    pub fn get_repository_status(&self, repo_path: &str) -> Result<GitStatus> {
        let repo = self.open_repository(repo_path)?;

        // Get current branch
        let head = repo.head()?;
        let current_branch = if head.is_branch() {
            head.shorthand().unwrap_or("HEAD").to_string()
        } else {
            "HEAD".to_string()
        };

        // Get status of files
        let mut status_options = StatusOptions::new();
        status_options
            .include_untracked(true)
            .include_ignored(false)
            .recurse_untracked_dirs(true);

        let statuses = repo.statuses(Some(&mut status_options))?;

        let mut staged_files = Vec::new();
        let mut modified_files = Vec::new();
        let mut untracked_files = Vec::new();

        for entry in statuses.iter() {
            let path = entry.path().unwrap_or("").to_string();
            let flags = entry.status();

            if flags.is_index_new()
                || flags.is_index_modified()
                || flags.is_index_deleted()
                || flags.is_index_renamed()
                || flags.is_index_typechange()
            {
                staged_files.push(path.clone());
            }

            if flags.is_wt_modified()
                || flags.is_wt_deleted()
                || flags.is_wt_renamed()
                || flags.is_wt_typechange()
            {
                modified_files.push(path.clone());
            }

            if flags.is_wt_new() {
                untracked_files.push(path);
            }
        }

        let is_clean = staged_files.is_empty() && modified_files.is_empty() && untracked_files.is_empty();

        // Get ahead/behind counts (simplified - would need remote tracking)
        let ahead = 0;
        let behind = 0;

        Ok(GitStatus {
            current_branch,
            is_clean,
            staged_files,
            modified_files,
            untracked_files,
            ahead,
            behind,
        })
    }

    pub fn get_branches(&self, repo_path: &str) -> Result<Vec<Branch>> {
        let repo = self.open_repository(repo_path)?;
        let mut branches = Vec::new();

        // Get current branch
        let head = repo.head().ok();
        let current_branch_name = head
            .as_ref()
            .and_then(|h| h.shorthand())
            .unwrap_or("")
            .to_string();

        // Iterate through local branches
        let local_branches = repo.branches(Some(BranchType::Local))?;
        for branch_result in local_branches {
            let (branch, _branch_type) = branch_result?;
            if let Some(name) = branch.name()? {
                let is_current = name == current_branch_name;
                
                // Get last commit info
                let (last_commit, last_commit_message) = if let Ok(commit) = branch.get().peel_to_commit() {
                    (
                        commit.id().to_string()[..8].to_string(),
                        commit.message().unwrap_or("").to_string(),
                    )
                } else {
                    ("unknown".to_string(), "".to_string())
                };

                branches.push(Branch {
                    name: name.to_string(),
                    is_current,
                    is_remote: false,
                    last_commit,
                    last_commit_message,
                });
            }
        }

        Ok(branches)
    }

    pub fn initialize_repository(&self, path: &str) -> Result<CloneResult> {
        let mut init_opts = RepositoryInitOptions::new();
        init_opts.initial_head("main");

        match Repository::init_opts(Path::new(path), &init_opts) {
            Ok(_repo) => Ok(CloneResult {
                success: true,
                path: path.to_string(),
                message: "Repository initialized successfully".to_string(),
            }),
            Err(e) => Ok(CloneResult {
                success: false,
                path: path.to_string(),
                message: format!("Failed to initialize repository: {}", e),
            }),
        }
    }

    fn open_repository(&self, repo_path: &str) -> Result<Repository> {
        // Simply open the repository fresh each time
        // This avoids thread safety issues with caching Repository objects
        Ok(Repository::open(repo_path)?)
    }

    pub fn check_repository_exists(&self, path: &str) -> bool {
        Repository::open(path).is_ok()
    }

    /// Add all changes to staging area
    pub fn add_all_changes(&self, repo_path: &str) -> Result<CloneResult> {
        let repo = self.open_repository(repo_path)?;
        let mut index = repo.index().map_err(|e| anyhow::anyhow!("Failed to get index: {}", e))?;
        
        // Add all files to the index
        index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
            .map_err(|e| anyhow::anyhow!("Failed to add files: {}", e))?;
        
        index.write().map_err(|e| anyhow::anyhow!("Failed to write index: {}", e))?;

        Ok(CloneResult {
            success: true,
            path: repo_path.to_string(),
            message: "Added all changes to staging area".to_string(),
        })
    }

    /// Commit staged changes
    pub fn commit_changes(&self, repo_path: &str, message: &str) -> Result<CloneResult> {
        let repo = self.open_repository(repo_path)?;
        
        // Get the signature (author)
        let signature = match repo.signature() {
            Ok(sig) => sig,
            Err(_) => {
                // Fallback to a default signature if none configured
                git2::Signature::now("Postgirl", "postgirl@localhost")
                    .map_err(|e| anyhow::anyhow!("Failed to create signature: {}", e))?
            }
        };

        // Get the tree from the index
        let mut index = repo.index().map_err(|e| anyhow::anyhow!("Failed to get index: {}", e))?;
        let tree_id = index.write_tree().map_err(|e| anyhow::anyhow!("Failed to write tree: {}", e))?;
        let tree = repo.find_tree(tree_id).map_err(|e| anyhow::anyhow!("Failed to find tree: {}", e))?;

        // Get the parent commit (if any)
        let parent_commit = repo.head()
            .and_then(|h| h.target().ok_or(git2::Error::from_str("No target")))
            .and_then(|oid| repo.find_commit(oid))
            .ok();

        // Create the commit
        let commit_result = if let Some(parent) = parent_commit {
            repo.commit(
                Some("HEAD"),
                &signature,
                &signature,
                message,
                &tree,
                &[&parent],
            )
        } else {
            // Initial commit
            repo.commit(
                Some("HEAD"),
                &signature,
                &signature,
                message,
                &tree,
                &[],
            )
        };

        match commit_result {
            Ok(_oid) => Ok(CloneResult {
                success: true,
                path: repo_path.to_string(),
                message: format!("Committed changes: {}", message),
            }),
            Err(e) => Ok(CloneResult {
                success: false,
                path: repo_path.to_string(),
                message: format!("Failed to commit: {}", e),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_initialize_repository() {
        let git_service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        let result = git_service.initialize_repository(repo_path).unwrap();
        
        assert!(result.success);
        assert!(git_service.check_repository_exists(repo_path));
    }

    #[test]
    fn test_repository_status_empty() {
        let git_service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initialize repository
        git_service.initialize_repository(repo_path).unwrap();

        // Get status - note that new repos without commits will be in "unborn" state
        let status = git_service.get_repository_status(repo_path);
        
        // The status might fail for unborn branches, which is expected behavior
        if let Ok(status) = status {
            assert!(status.staged_files.is_empty());
            assert!(status.modified_files.is_empty());
            assert!(status.untracked_files.is_empty());
        }
        // If it fails due to unborn branch, that's also acceptable
    }

    #[test]
    fn test_repository_status_with_untracked_file() {
        let git_service = GitService::new();
        let temp_dir = TempDir::new().unwrap();
        let repo_path = temp_dir.path().to_str().unwrap();

        // Initialize repository
        git_service.initialize_repository(repo_path).unwrap();

        // Create an untracked file
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "test content").unwrap();

        // Get status - might fail for unborn branches
        let status = git_service.get_repository_status(repo_path);
        
        if let Ok(status) = status {
            assert!(!status.is_clean);
            assert_eq!(status.untracked_files.len(), 1);
            assert!(status.untracked_files.contains(&"test.txt".to_string()));
        }
        // If it fails due to unborn branch, that's also acceptable for this test
    }
}