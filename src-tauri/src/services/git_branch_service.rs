use crate::models::git::{
    BranchConfig, BranchCreateRequest, BranchCreateResult, BranchGenerator, BranchPattern,
    FeatureType, GitBranch, SystemInfo,
};
use crate::services::database_service::DatabaseService;
use anyhow::{Context, Result};
use serde_json;
use sqlx::Row;
use std::env;
use std::process::Command;
use tauri::{AppHandle, Manager};

#[derive(Clone)]
pub struct GitBranchService {
    db: DatabaseService,
    generator: BranchGenerator,
}

impl GitBranchService {
    pub async fn new(app_handle: &AppHandle) -> Result<Self> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| anyhow::anyhow!("Failed to get app data directory: {}", e))?;
        let db_path = app_data_dir.join("postgirl.db");
        let db = DatabaseService::new(db_path.to_str().unwrap()).await?;
        let system_info = Self::detect_system_info()?;
        let config = BranchConfig::default(); // TODO: Load from settings
        let generator = BranchGenerator::new(config, system_info);

        Ok(Self { db, generator })
    }

    /// Detect system information (username, machine name, OS)
    pub fn detect_system_info() -> Result<SystemInfo> {
        // Get username
        let username = env::var("USER")
            .or_else(|_| env::var("USERNAME"))
            .or_else(|_| env::var("LOGNAME"))
            .unwrap_or_else(|_| "unknown".to_string());

        // Get machine name
        let machine_name = if cfg!(target_os = "macos") || cfg!(target_os = "linux") {
            Command::new("hostname")
                .output()
                .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
                .unwrap_or_else(|_| "unknown".to_string())
        } else if cfg!(target_os = "windows") {
            env::var("COMPUTERNAME").unwrap_or_else(|_| "unknown".to_string())
        } else {
            "unknown".to_string()
        };

        // Get OS type
        let os_type = if cfg!(target_os = "macos") {
            "macOS".to_string()
        } else if cfg!(target_os = "linux") {
            "Linux".to_string()
        } else if cfg!(target_os = "windows") {
            "Windows".to_string()
        } else {
            "Unknown".to_string()
        };

        Ok(SystemInfo {
            username,
            machine_name,
            os_type,
        })
    }

    /// Get current system info
    pub fn get_system_info(&self) -> &SystemInfo {
        &self.generator.system_info
    }

    /// Get branch configuration
    pub fn get_branch_config(&self) -> &BranchConfig {
        &self.generator.config
    }

    /// Generate a branch name from a pattern
    pub fn generate_branch_name(&self, pattern: &BranchPattern) -> Result<String> {
        self.generator
            .generate_branch_name(pattern)
            .map_err(|e| anyhow::anyhow!(e))
    }

    /// Suggest a branch pattern for a workspace
    pub fn suggest_pattern(
        &self,
        workspace_name: &str,
        feature_type: Option<FeatureType>,
    ) -> BranchPattern {
        self.generator.suggest_pattern(workspace_name, feature_type)
    }

    /// Create a new branch using the pattern
    pub async fn create_branch(
        &self,
        workspace_path: &str,
        request: &BranchCreateRequest,
    ) -> Result<BranchCreateResult> {
        // Generate branch name
        let branch_name = self.generate_branch_name(&request.pattern)?;

        // Check if branch already exists
        if self.branch_exists(workspace_path, &branch_name)? {
            return Ok(BranchCreateResult {
                branch_name: branch_name.clone(),
                created: false,
                switched: false,
                message: format!("Branch '{}' already exists", branch_name),
            });
        }

        // Create the branch
        let current_branch = self.get_current_branch(workspace_path)?;
        let base_branch = request
            .base_branch
            .as_deref()
            .unwrap_or(current_branch.as_str());

        let create_result = Command::new("git")
            .current_dir(workspace_path)
            .args(&["checkout", "-b", &branch_name, base_branch])
            .output()
            .context("Failed to create branch")?;

        if !create_result.status.success() {
            let error_msg = String::from_utf8_lossy(&create_result.stderr);
            return Ok(BranchCreateResult {
                branch_name: branch_name.clone(),
                created: false,
                switched: false,
                message: format!("Failed to create branch: {}", error_msg),
            });
        }

        let mut switched = true;
        let mut message = format!("Created and switched to branch '{}'", branch_name);

        // If auto_switch is false, switch back to original branch
        if !request.auto_switch {
            let switch_back_result = Command::new("git")
                .current_dir(workspace_path)
                .args(&["checkout", base_branch])
                .output()
                .context("Failed to switch back to base branch")?;

            if switch_back_result.status.success() {
                switched = false;
                message = format!("Created branch '{}' (stayed on '{}')", branch_name, base_branch);
            }
        }

        // Save branch creation to database for tracking
        self.save_branch_creation(&branch_name, &request.pattern)
            .await?;

        Ok(BranchCreateResult {
            branch_name,
            created: true,
            switched,
            message,
        })
    }

    /// Check if a branch exists
    fn branch_exists(&self, workspace_path: &str, branch_name: &str) -> Result<bool> {
        let output = Command::new("git")
            .current_dir(workspace_path)
            .args(&["branch", "--list", branch_name])
            .output()
            .context("Failed to check if branch exists")?;

        Ok(!output.stdout.is_empty())
    }

    /// Get current branch name
    fn get_current_branch(&self, workspace_path: &str) -> Result<String> {
        let output = Command::new("git")
            .current_dir(workspace_path)
            .args(&["branch", "--show-current"])
            .output()
            .context("Failed to get current branch")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("Failed to get current branch"));
        }

        let branch_name = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(branch_name)
    }

    /// List all branches in the repository
    pub fn list_branches(&self, workspace_path: &str) -> Result<Vec<GitBranch>> {
        let output = Command::new("git")
            .current_dir(workspace_path)
            .args(&["branch", "-a", "--format=%(refname:short)|%(HEAD)|%(upstream:track)"])
            .output()
            .context("Failed to list branches")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("Failed to list branches"));
        }

        let mut branches = Vec::new();
        let branch_list = String::from_utf8_lossy(&output.stdout);

        for line in branch_list.lines() {
            if line.trim().is_empty() {
                continue;
            }

            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 2 {
                let name = parts[0].trim().to_string();
                let is_current = parts[1].trim() == "*";
                let is_remote = name.starts_with("origin/") || name.contains("remotes/");

                // Get last commit info
                let (last_commit_hash, last_commit_message, last_commit_date) =
                    self.get_branch_commit_info(workspace_path, &name)?;

                branches.push(GitBranch {
                    name,
                    is_current,
                    is_remote,
                    last_commit_hash: Some(last_commit_hash),
                    last_commit_message: Some(last_commit_message),
                    last_commit_date: Some(last_commit_date),
                    ahead_count: None, // TODO: Parse from upstream:track
                    behind_count: None,
                });
            }
        }

        Ok(branches)
    }

    /// Get commit information for a branch
    fn get_branch_commit_info(
        &self,
        workspace_path: &str,
        branch_name: &str,
    ) -> Result<(String, String, chrono::DateTime<chrono::Utc>)> {
        let output = Command::new("git")
            .current_dir(workspace_path)
            .args(&[
                "log",
                "-1",
                "--format=%H|%s|%ct",
                branch_name,
            ])
            .output()
            .context("Failed to get branch commit info")?;

        if !output.status.success() {
            return Ok((
                "unknown".to_string(),
                "No commits".to_string(),
                chrono::Utc::now(),
            ));
        }

        let commit_info = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = commit_info.trim().split('|').collect();

        if parts.len() >= 3 {
            let hash = parts[0].to_string();
            let message = parts[1].to_string();
            let timestamp = parts[2].parse::<i64>().unwrap_or(0);
            let date = chrono::DateTime::from_timestamp(timestamp, 0)
                .unwrap_or_else(chrono::Utc::now);

            Ok((hash, message, date))
        } else {
            Ok((
                "unknown".to_string(),
                "No commits".to_string(),
                chrono::Utc::now(),
            ))
        }
    }

    /// Save branch creation to database for tracking
    async fn save_branch_creation(
        &self,
        branch_name: &str,
        pattern: &BranchPattern,
    ) -> Result<()> {
        let pool = self.db.get_pool();
        let pattern_json = serde_json::to_string(pattern)?;

        sqlx::query(
            "INSERT INTO branch_history (branch_name, pattern_json, created_at) VALUES (?, ?, ?)"
        )
        .bind(branch_name)
        .bind(pattern_json)
        .bind(chrono::Utc::now())
        .execute(&pool)
        .await
        .context("Failed to save branch creation")?;

        Ok(())
    }

    /// Get branch creation history
    pub async fn get_branch_history(&self, limit: Option<i32>) -> Result<Vec<(String, BranchPattern, chrono::DateTime<chrono::Utc>)>> {
        let pool = self.db.get_pool();
        let limit = limit.unwrap_or(50);

        let rows = sqlx::query(
            "SELECT branch_name, pattern_json, created_at FROM branch_history ORDER BY created_at DESC LIMIT ?"
        )
        .bind(limit)
        .fetch_all(&pool)
        .await
        .context("Failed to get branch history")?;

        let mut history = Vec::new();
        for row in rows {
            let branch_name: String = row.get("branch_name");
            let pattern_json: String = row.get("pattern_json");
            let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");

            if let Ok(pattern) = serde_json::from_str::<BranchPattern>(&pattern_json) {
                history.push((branch_name, pattern, created_at));
            }
        }

        Ok(history)
    }

    /// Update branch configuration
    pub fn update_config(&mut self, config: BranchConfig) -> Result<()> {
        let system_info = self.generator.system_info.clone();
        self.generator = BranchGenerator::new(config, system_info);
        Ok(())
    }

    /// Get suggested branch names for common operations
    pub fn get_suggested_branches(&self, workspace_name: &str) -> Vec<(FeatureType, String)> {
        let mut suggestions = Vec::new();
        
        for feature_type in &self.generator.config.allowed_feature_types {
            let pattern = self.suggest_pattern(workspace_name, Some(feature_type.clone()));
            if let Ok(branch_name) = self.generate_branch_name(&pattern) {
                suggestions.push((feature_type.clone(), branch_name));
            }
        }
        
        suggestions
    }
}