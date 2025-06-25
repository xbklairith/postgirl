use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCredentials {
    pub username: String,
    pub password: String,
    pub ssh_key_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloneResult {
    pub success: bool,
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub current_branch: String,
    pub is_clean: bool,
    pub staged_files: Vec<String>,
    pub modified_files: Vec<String>,
    pub untracked_files: Vec<String>,
    pub ahead: usize,
    pub behind: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Branch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub last_commit: String,
    pub last_commit_message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
    pub files_changed: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRemote {
    pub name: String,
    pub url: String,
    pub fetch_url: String,
    pub push_url: String,
}

/// Branch naming pattern for automatic branch generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchPattern {
    pub workspace: String,
    pub username: String,
    pub machine: String,
    pub feature_type: FeatureType,
    pub description: Option<String>,
}

/// Types of features for branch categorization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FeatureType {
    #[serde(rename = "feature")]
    Feature,
    #[serde(rename = "bugfix")]
    Bugfix,
    #[serde(rename = "hotfix")]
    Hotfix,
    #[serde(rename = "experiment")]
    Experiment,
    #[serde(rename = "refactor")]
    Refactor,
    #[serde(rename = "docs")]
    Documentation,
}

impl fmt::Display for FeatureType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FeatureType::Feature => write!(f, "feature"),
            FeatureType::Bugfix => write!(f, "bugfix"),
            FeatureType::Hotfix => write!(f, "hotfix"),
            FeatureType::Experiment => write!(f, "experiment"),
            FeatureType::Refactor => write!(f, "refactor"),
            FeatureType::Documentation => write!(f, "docs"),
        }
    }
}

/// System information for branch generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub username: String,
    pub machine_name: String,
    pub os_type: String,
}

/// Branch configuration settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchConfig {
    pub auto_create_branches: bool,
    pub default_feature_type: FeatureType,
    pub branch_prefix_pattern: String, // e.g., "{workspace}/{username}-{machine}/{feature}"
    pub max_branch_name_length: usize,
    pub allowed_feature_types: Vec<FeatureType>,
}

impl Default for BranchConfig {
    fn default() -> Self {
        Self {
            auto_create_branches: true,
            default_feature_type: FeatureType::Feature,
            branch_prefix_pattern: "{workspace}/{username}-{machine}/{feature}".to_string(),
            max_branch_name_length: 100,
            allowed_feature_types: vec![
                FeatureType::Feature,
                FeatureType::Bugfix,
                FeatureType::Hotfix,
                FeatureType::Experiment,
                FeatureType::Refactor,
                FeatureType::Documentation,
            ],
        }
    }
}

/// Git branch information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub last_commit_hash: Option<String>,
    pub last_commit_message: Option<String>,
    pub last_commit_date: Option<DateTime<Utc>>,
    pub ahead_count: Option<i32>,
    pub behind_count: Option<i32>,
}

/// Branch creation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchCreateRequest {
    pub pattern: BranchPattern,
    pub base_branch: Option<String>, // defaults to current branch
    pub auto_switch: bool, // whether to switch to new branch after creation
}

/// Branch creation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchCreateResult {
    pub branch_name: String,
    pub created: bool,
    pub switched: bool,
    pub message: String,
}

/// Branch generator for creating standardized branch names
#[derive(Clone)]
pub struct BranchGenerator {
    pub config: BranchConfig,
    pub system_info: SystemInfo,
}

impl BranchGenerator {
    pub fn new(config: BranchConfig, system_info: SystemInfo) -> Self {
        Self { config, system_info }
    }

    /// Generate a branch name from a pattern
    pub fn generate_branch_name(&self, pattern: &BranchPattern) -> Result<String, String> {
        let mut branch_name = self.config.branch_prefix_pattern.clone();
        
        // Replace template variables
        branch_name = branch_name.replace("{workspace}", &self.sanitize_name(&pattern.workspace));
        branch_name = branch_name.replace("{username}", &self.sanitize_name(&pattern.username));
        branch_name = branch_name.replace("{machine}", &self.sanitize_name(&pattern.machine));
        branch_name = branch_name.replace("{feature}", &pattern.feature_type.to_string());
        
        // Add description if provided
        if let Some(desc) = &pattern.description {
            let sanitized_desc = self.sanitize_name(desc);
            if !sanitized_desc.is_empty() {
                branch_name = format!("{}-{}", branch_name, sanitized_desc);
            }
        }
        
        // Ensure branch name length limit
        if branch_name.len() > self.config.max_branch_name_length {
            branch_name.truncate(self.config.max_branch_name_length);
            // Remove trailing hyphens
            branch_name = branch_name.trim_end_matches('-').to_string();
        }
        
        // Validate branch name
        self.validate_branch_name(&branch_name)?;
        
        Ok(branch_name)
    }
    
    /// Sanitize a name component for use in branch names
    fn sanitize_name(&self, name: &str) -> String {
        name.to_lowercase()
            .chars()
            .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
            .collect::<String>()
            .split('-')
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>()
            .join("-")
    }
    
    /// Validate that a branch name follows Git naming conventions
    fn validate_branch_name(&self, name: &str) -> Result<(), String> {
        if name.is_empty() {
            return Err("Branch name cannot be empty".to_string());
        }
        
        if name.starts_with('-') || name.ends_with('-') {
            return Err("Branch name cannot start or end with hyphen".to_string());
        }
        
        if name.contains("..") || name.contains("//") {
            return Err("Branch name cannot contain consecutive dots or slashes".to_string());
        }
        
        // Check for Git-forbidden characters
        let forbidden_chars = ['~', '^', ':', '?', '*', '[', '\\', ' '];
        if name.chars().any(|c| forbidden_chars.contains(&c)) {
            return Err("Branch name contains forbidden characters".to_string());
        }
        
        Ok(())
    }
    
    /// Create a suggested branch pattern based on system info and workspace
    pub fn suggest_pattern(&self, workspace_name: &str, feature_type: Option<FeatureType>) -> BranchPattern {
        BranchPattern {
            workspace: workspace_name.to_string(),
            username: self.system_info.username.clone(),
            machine: self.system_info.machine_name.clone(),
            feature_type: feature_type.unwrap_or(self.config.default_feature_type.clone()),
            description: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_generator() -> BranchGenerator {
        let config = BranchConfig::default();
        let system_info = SystemInfo {
            username: "john.doe".to_string(),
            machine_name: "MacBook-Pro".to_string(),
            os_type: "macOS".to_string(),
        };
        BranchGenerator::new(config, system_info)
    }

    #[test]
    fn test_generate_branch_name() {
        let generator = create_test_generator();
        let pattern = BranchPattern {
            workspace: "ecommerce-api".to_string(),
            username: "john.doe".to_string(),
            machine: "MacBook-Pro".to_string(),
            feature_type: FeatureType::Feature,
            description: Some("add payment endpoints".to_string()),
        };

        let result = generator.generate_branch_name(&pattern).unwrap();
        assert_eq!(result, "ecommerce-api/john-doe-macbook-pro/feature-add-payment-endpoints");
    }

    #[test]
    fn test_sanitize_name() {
        let generator = create_test_generator();
        assert_eq!(generator.sanitize_name("John Doe"), "john-doe");
        assert_eq!(generator.sanitize_name("API v2.0"), "api-v2-0");
        assert_eq!(generator.sanitize_name("special!@#chars"), "special-chars");
    }

    #[test]
    fn test_validate_branch_name() {
        let generator = create_test_generator();
        assert!(generator.validate_branch_name("valid-branch-name").is_ok());
        assert!(generator.validate_branch_name("-invalid").is_err());
        assert!(generator.validate_branch_name("invalid-").is_err());
        assert!(generator.validate_branch_name("invalid..branch").is_err());
        assert!(generator.validate_branch_name("invalid~branch").is_err());
    }
}