use crate::models::environment::*;
use crate::services::file_sync_service::FileSyncService;
use crate::services::database_service::DatabaseService;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use anyhow::{Result, anyhow};
use uuid::Uuid;
use chrono::Utc;
use sqlx::Row;

#[derive(Clone)]
pub struct EnvironmentService {
    database: Arc<DatabaseService>,
    file_sync: FileSyncService,
}

impl EnvironmentService {
    pub fn new(database: Arc<DatabaseService>) -> Self {
        Self {
            database,
            file_sync: FileSyncService::new(),
        }
    }

    // Environment CRUD operations
    pub async fn create_environment(&self, workspace_id: String, name: String) -> Result<Environment> {
        let now = Utc::now();
        let environment = Environment {
            id: Uuid::new_v4().to_string(),
            name: name.clone(),
            variables: HashMap::new(),
            is_active: false,
            created_at: now,
            updated_at: now,
        };

        // Store in database
        sqlx::query(
            r#"
            INSERT INTO environments (id, workspace_id, name, is_active, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            "#
        )
        .bind(&environment.id)
        .bind(&workspace_id)
        .bind(&environment.name)
        .bind(environment.is_active)
        .bind(&environment.created_at.to_rfc3339())
        .bind(&environment.updated_at.to_rfc3339())
        .execute(&self.database.get_pool())
        .await
        .map_err(|e| anyhow!("Failed to create environment in database: {}", e))?;

        // Write to file system
        if let Err(e) = self.file_sync.write_environment_file(&workspace_id, &environment).await {
            eprintln!("Warning: Failed to write environment file: {}", e);
            // Don't fail the entire operation if file sync fails
        }

        Ok(environment)
    }

    pub async fn get_environment(&self, environment_id: &str) -> Result<Option<Environment>> {
        // Get basic environment info from database
        let row = sqlx::query(
            "SELECT id, workspace_id, name, is_active, created_at, updated_at FROM environments WHERE id = ?1"
        )
        .bind(environment_id)
        .fetch_optional(&self.database.get_pool())
        .await
        .map_err(|e| anyhow!("Failed to get environment: {}", e))?;

        if let Some(row) = row {
            // Get variables from database
            let variable_rows = sqlx::query(
                "SELECT variable_key, value, is_secret, variable_type FROM environment_variables WHERE environment_id = ?1"
            )
            .bind(environment_id)
            .fetch_all(&self.database.get_pool())
            .await
            .map_err(|e| anyhow!("Failed to get environment variables: {}", e))?;

            let mut variables = HashMap::new();
            for var_row in variable_rows {
                let variable = EnvironmentVariable {
                    key: var_row.get("variable_key"),
                    value: var_row.get("value"),
                    is_secret: var_row.get("is_secret"),
                    variable_type: VariableType::from_str(&var_row.get::<String, _>("variable_type")),
                };
                variables.insert(variable.key.clone(), variable);
            }

            let environment = Environment {
                id: row.get("id"),
                name: row.get("name"),
                variables,
                is_active: row.get("is_active"),
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                    .unwrap_or_default().with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                    .unwrap_or_default().with_timezone(&chrono::Utc),
            };

            Ok(Some(environment))
        } else {
            Ok(None)
        }
    }

    pub async fn update_environment(&self, environment: Environment) -> Result<Environment> {
        let mut updated_env = environment;
        updated_env.updated_at = Utc::now();

        // Update in database
        sqlx::query(
            "UPDATE environments SET name = ?1, is_active = ?2, updated_at = ?3 WHERE id = ?4"
        )
        .bind(&updated_env.name)
        .bind(updated_env.is_active)
        .bind(&updated_env.updated_at.to_rfc3339())
        .bind(&updated_env.id)
        .execute(&self.database.get_pool())
        .await
        .map_err(|e| anyhow!("Failed to update environment in database: {}", e))?;

        // Update variables in database - first delete all existing variables
        sqlx::query("DELETE FROM environment_variables WHERE environment_id = ?1")
            .bind(&updated_env.id)
            .execute(&self.database.get_pool())
            .await
            .map_err(|e| anyhow!("Failed to delete existing variables: {}", e))?;

        // Insert all variables
        for variable in updated_env.variables.values() {
            sqlx::query(
                "INSERT INTO environment_variables (environment_id, variable_key, value, is_secret, variable_type) VALUES (?1, ?2, ?3, ?4, ?5)"
            )
            .bind(&updated_env.id)
            .bind(&variable.key)
            .bind(&variable.value)
            .bind(variable.is_secret)
            .bind(variable.variable_type.as_str())
            .execute(&self.database.get_pool())
            .await
            .map_err(|e| anyhow!("Failed to insert variable: {}", e))?;
        }

        // Get workspace_id for file sync
        let workspace_row = sqlx::query("SELECT workspace_id FROM environments WHERE id = ?1")
            .bind(&updated_env.id)
            .fetch_one(&self.database.get_pool())
            .await
            .map_err(|e| anyhow!("Failed to get workspace_id: {}", e))?;
        
        let workspace_id: String = workspace_row.get("workspace_id");

        // Write to file system
        if let Err(e) = self.file_sync.write_environment_file(&workspace_id, &updated_env).await {
            eprintln!("Warning: Failed to write environment file: {}", e);
        }

        Ok(updated_env)
    }

    pub async fn delete_environment(&self, environment_id: &str) -> Result<bool> {
        // Get environment info before deleting for file cleanup
        let env = self.get_environment(environment_id).await?;
        
        // Delete from database (cascade will handle variables)
        let result = sqlx::query("DELETE FROM environments WHERE id = ?1")
            .bind(environment_id)
            .execute(&self.database.get_pool())
            .await
            .map_err(|e| anyhow!("Failed to delete environment: {}", e))?;

        // Clean up file if environment existed
        if let Some(environment) = env {
            let workspace_row = sqlx::query("SELECT workspace_id FROM environments WHERE id = ?1")
                .bind(environment_id)
                .fetch_optional(&self.database.get_pool())
                .await
                .map_err(|e| anyhow!("Failed to get workspace_id: {}", e))?;
            
            if let Some(ws_row) = workspace_row {
                let workspace_id: String = ws_row.get("workspace_id");
                if let Err(e) = self.file_sync.delete_environment_file(&workspace_id, &environment.name).await {
                    eprintln!("Warning: Failed to delete environment file: {}", e);
                }
            }
        }

        Ok(result.rows_affected() > 0)
    }

    pub async fn list_environments(&self, workspace_id: &str) -> Result<Vec<Environment>> {
        let rows = sqlx::query(
            "SELECT id, workspace_id, name, is_active, created_at, updated_at FROM environments WHERE workspace_id = ?1"
        )
        .bind(workspace_id)
        .fetch_all(&self.database.get_pool())
        .await
        .map_err(|e| anyhow!("Failed to list environments: {}", e))?;

        let mut environments = Vec::new();
        for row in rows {
            let env_id: String = row.get("id");
            
            // Get variables for this environment
            let variable_rows = sqlx::query(
                "SELECT variable_key, value, is_secret, variable_type FROM environment_variables WHERE environment_id = ?1"
            )
            .bind(&env_id)
            .fetch_all(&self.database.get_pool())
            .await
            .map_err(|e| anyhow!("Failed to get environment variables: {}", e))?;

            let mut variables = HashMap::new();
            for var_row in variable_rows {
                let variable = EnvironmentVariable {
                    key: var_row.get("variable_key"),
                    value: var_row.get("value"),
                    is_secret: var_row.get("is_secret"),
                    variable_type: VariableType::from_str(&var_row.get::<String, _>("variable_type")),
                };
                variables.insert(variable.key.clone(), variable);
            }

            let environment = Environment {
                id: env_id,
                name: row.get("name"),
                variables,
                is_active: row.get("is_active"),
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))
                    .unwrap_or_default().with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))
                    .unwrap_or_default().with_timezone(&chrono::Utc),
            };

            environments.push(environment);
        }

        Ok(environments)
    }

    // Environment variable operations
    pub async fn add_variable(&self, environment_id: &str, variable: EnvironmentVariable) -> Result<Environment> {
        // Insert variable into database
        sqlx::query(
            "INSERT OR REPLACE INTO environment_variables (environment_id, variable_key, value, is_secret, variable_type) VALUES (?1, ?2, ?3, ?4, ?5)"
        )
        .bind(environment_id)
        .bind(&variable.key)
        .bind(&variable.value)
        .bind(variable.is_secret)
        .bind(variable.variable_type.as_str())
        .execute(&self.database.get_pool())
        .await
        .map_err(|e| anyhow!("Failed to add variable: {}", e))?;

        // Update environment timestamp
        sqlx::query("UPDATE environments SET updated_at = ?1 WHERE id = ?2")
            .bind(&Utc::now().to_rfc3339())
            .bind(environment_id)
            .execute(&self.database.get_pool())
            .await
            .map_err(|e| anyhow!("Failed to update environment timestamp: {}", e))?;

        // Return updated environment
        self.get_environment(environment_id).await?
            .ok_or_else(|| anyhow!("Environment not found after adding variable"))
    }

    pub async fn update_variable(&self, environment_id: &str, variable: EnvironmentVariable) -> Result<Environment> {
        // Update variable in database
        sqlx::query(
            "UPDATE environment_variables SET value = ?1, is_secret = ?2, variable_type = ?3, updated_at = ?4 WHERE environment_id = ?5 AND variable_key = ?6"
        )
        .bind(&variable.value)
        .bind(variable.is_secret)
        .bind(variable.variable_type.as_str())
        .bind(&Utc::now().to_rfc3339())
        .bind(environment_id)
        .bind(&variable.key)
        .execute(&self.database.get_pool())
        .await
        .map_err(|e| anyhow!("Failed to update variable: {}", e))?;

        // Update environment timestamp
        sqlx::query("UPDATE environments SET updated_at = ?1 WHERE id = ?2")
            .bind(&Utc::now().to_rfc3339())
            .bind(environment_id)
            .execute(&self.database.get_pool())
            .await
            .map_err(|e| anyhow!("Failed to update environment timestamp: {}", e))?;

        // Return updated environment
        self.get_environment(environment_id).await?
            .ok_or_else(|| anyhow!("Environment not found after updating variable"))
    }

    pub async fn remove_variable(&self, environment_id: &str, variable_key: &str) -> Result<Environment> {
        // Delete variable from database
        sqlx::query("DELETE FROM environment_variables WHERE environment_id = ?1 AND variable_key = ?2")
            .bind(environment_id)
            .bind(variable_key)
            .execute(&self.database.get_pool())
            .await
            .map_err(|e| anyhow!("Failed to remove variable: {}", e))?;

        // Update environment timestamp
        sqlx::query("UPDATE environments SET updated_at = ?1 WHERE id = ?2")
            .bind(&Utc::now().to_rfc3339())
            .bind(environment_id)
            .execute(&self.database.get_pool())
            .await
            .map_err(|e| anyhow!("Failed to update environment timestamp: {}", e))?;

        // Return updated environment
        self.get_environment(environment_id).await?
            .ok_or_else(|| anyhow!("Environment not found after removing variable"))
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