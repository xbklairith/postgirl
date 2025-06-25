use crate::models::environment::*;
use std::collections::{HashMap, HashSet};
use anyhow::{Result, anyhow};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Clone)]
pub struct EnvironmentService {
    // In-memory storage for now, will integrate with database later
    environments: std::sync::Arc<std::sync::RwLock<HashMap<String, Environment>>>,
}

impl EnvironmentService {
    pub fn new() -> Self {
        Self {
            environments: std::sync::Arc::new(std::sync::RwLock::new(HashMap::new())),
        }
    }

    // Environment CRUD operations
    pub async fn create_environment(&self, _workspace_id: String, name: String) -> Result<Environment> {
        let now = Utc::now();
        let environment = Environment {
            id: Uuid::new_v4().to_string(),
            name,
            variables: HashMap::new(),
            is_active: false,
            created_at: now,
            updated_at: now,
        };

        let mut environments = self.environments.write().map_err(|e| anyhow!("Lock error: {}", e))?;
        environments.insert(environment.id.clone(), environment.clone());

        Ok(environment)
    }

    pub async fn get_environment(&self, environment_id: &str) -> Result<Option<Environment>> {
        let environments = self.environments.read().map_err(|e| anyhow!("Lock error: {}", e))?;
        Ok(environments.get(environment_id).cloned())
    }

    pub async fn update_environment(&self, environment: Environment) -> Result<Environment> {
        let mut updated_env = environment;
        updated_env.updated_at = Utc::now();

        let mut environments = self.environments.write().map_err(|e| anyhow!("Lock error: {}", e))?;
        environments.insert(updated_env.id.clone(), updated_env.clone());

        Ok(updated_env)
    }

    pub async fn delete_environment(&self, environment_id: &str) -> Result<bool> {
        let mut environments = self.environments.write().map_err(|e| anyhow!("Lock error: {}", e))?;
        Ok(environments.remove(environment_id).is_some())
    }

    pub async fn list_environments(&self, _workspace_id: &str) -> Result<Vec<Environment>> {
        let environments = self.environments.read().map_err(|e| anyhow!("Lock error: {}", e))?;
        // Filter by workspace_id would require storing workspace_id in Environment model
        // For now, return all environments
        Ok(environments.values().cloned().collect())
    }

    // Environment variable operations
    pub async fn add_variable(&self, environment_id: &str, variable: EnvironmentVariable) -> Result<Environment> {
        let mut environments = self.environments.write().map_err(|e| anyhow!("Lock error: {}", e))?;
        
        if let Some(env) = environments.get_mut(environment_id) {
            env.variables.insert(variable.key.clone(), variable);
            env.updated_at = Utc::now();
            Ok(env.clone())
        } else {
            Err(anyhow!("Environment not found: {}", environment_id))
        }
    }

    pub async fn update_variable(&self, environment_id: &str, variable: EnvironmentVariable) -> Result<Environment> {
        let mut environments = self.environments.write().map_err(|e| anyhow!("Lock error: {}", e))?;
        
        if let Some(env) = environments.get_mut(environment_id) {
            if env.variables.contains_key(&variable.key) {
                env.variables.insert(variable.key.clone(), variable);
                env.updated_at = Utc::now();
                Ok(env.clone())
            } else {
                Err(anyhow!("Variable not found: {}", variable.key))
            }
        } else {
            Err(anyhow!("Environment not found: {}", environment_id))
        }
    }

    pub async fn remove_variable(&self, environment_id: &str, variable_key: &str) -> Result<Environment> {
        let mut environments = self.environments.write().map_err(|e| anyhow!("Lock error: {}", e))?;
        
        if let Some(env) = environments.get_mut(environment_id) {
            env.variables.remove(variable_key);
            env.updated_at = Utc::now();
            Ok(env.clone())
        } else {
            Err(anyhow!("Environment not found: {}", environment_id))
        }
    }

    // Variable substitution
    pub fn substitute_variables(&self, text: &str, variables: &HashMap<String, String>) -> String {
        let mut result = text.to_string();
        
        for (key, value) in variables {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, value);
        }

        result
    }

    pub fn extract_variables(&self, text: &str) -> Vec<String> {
        let re = regex::Regex::new(r"\{\{([^}]+)\}\}").unwrap();
        let mut seen = HashSet::new();
        let mut variables = Vec::new();
        
        for cap in re.captures_iter(text) {
            let var = cap[1].to_string();
            if seen.insert(var.clone()) {
                variables.push(var);
            }
        }
        
        variables
    }
}