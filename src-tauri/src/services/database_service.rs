use crate::models::workspace::{Workspace, WorkspaceSettings, WorkspaceSummary};
use anyhow::Result;
use chrono::Utc;
use sqlx::{migrate::MigrateDatabase, Sqlite, SqlitePool, Row};
use std::path::Path;

pub struct DatabaseService {
    pool: SqlitePool,
}

impl DatabaseService {
    pub async fn new(database_path: &str) -> Result<Self> {
        // Ensure the database directory exists
        if let Some(parent) = Path::new(database_path).parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        // Create database if it doesn't exist
        if !Sqlite::database_exists(database_path).await.unwrap_or(false) {
            Sqlite::create_database(database_path).await?;
        }

        // Connect to database
        let pool = SqlitePool::connect(database_path).await?;

        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await?;

        Ok(Self { pool })
    }

    // Workspace CRUD operations
    pub async fn create_workspace(&self, workspace: &Workspace) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO workspaces (
                id, name, description, git_repository_url, local_path, 
                is_active, created_at, updated_at, last_accessed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&workspace.id)
        .bind(&workspace.name)
        .bind(&workspace.description)
        .bind(&workspace.git_repository_url)
        .bind(&workspace.local_path)
        .bind(workspace.is_active)
        .bind(workspace.created_at)
        .bind(workspace.updated_at)
        .bind(workspace.last_accessed_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_workspace(&self, id: &str) -> Result<Option<Workspace>> {
        let workspace = sqlx::query_as!(
            Workspace,
            "SELECT * FROM workspaces WHERE id = ?",
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(workspace)
    }

    pub async fn get_all_workspaces(&self) -> Result<Vec<Workspace>> {
        let workspaces = sqlx::query_as!(
            Workspace,
            "SELECT * FROM workspaces ORDER BY last_accessed_at DESC, created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(workspaces)
    }

    pub async fn get_active_workspace(&self) -> Result<Option<Workspace>> {
        let workspace = sqlx::query_as!(
            Workspace,
            "SELECT * FROM workspaces WHERE is_active = 1 LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(workspace)
    }

    pub async fn update_workspace(&self, workspace: &Workspace) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE workspaces SET 
                name = ?, description = ?, git_repository_url = ?, 
                local_path = ?, is_active = ?, updated_at = ?, last_accessed_at = ?
            WHERE id = ?
            "#,
            workspace.name,
            workspace.description,
            workspace.git_repository_url,
            workspace.local_path,
            workspace.is_active,
            workspace.updated_at,
            workspace.last_accessed_at,
            workspace.id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn delete_workspace(&self, id: &str) -> Result<()> {
        // Delete related settings first
        sqlx::query!("DELETE FROM workspace_settings WHERE workspace_id = ?", id)
            .execute(&self.pool)
            .await?;

        // Delete workspace
        sqlx::query!("DELETE FROM workspaces WHERE id = ?", id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn set_active_workspace(&self, id: &str) -> Result<()> {
        // First deactivate all workspaces
        sqlx::query!("UPDATE workspaces SET is_active = 0, updated_at = ?", Utc::now())
            .execute(&self.pool)
            .await?;

        // Then activate the specified workspace and update last_accessed_at
        sqlx::query!(
            "UPDATE workspaces SET is_active = 1, last_accessed_at = ?, updated_at = ? WHERE id = ?",
            Utc::now(),
            Utc::now(),
            id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Workspace Settings operations
    pub async fn create_workspace_settings(&self, settings: &WorkspaceSettings) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO workspace_settings (
                id, workspace_id, auto_save, sync_on_startup, default_timeout,
                follow_redirects, verify_ssl, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            settings.id,
            settings.workspace_id,
            settings.auto_save,
            settings.sync_on_startup,
            settings.default_timeout,
            settings.follow_redirects,
            settings.verify_ssl,
            settings.created_at,
            settings.updated_at
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_workspace_settings(&self, workspace_id: &str) -> Result<Option<WorkspaceSettings>> {
        let settings = sqlx::query_as!(
            WorkspaceSettings,
            "SELECT * FROM workspace_settings WHERE workspace_id = ?",
            workspace_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(settings)
    }

    pub async fn update_workspace_settings(&self, settings: &WorkspaceSettings) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE workspace_settings SET 
                auto_save = ?, sync_on_startup = ?, default_timeout = ?,
                follow_redirects = ?, verify_ssl = ?, updated_at = ?
            WHERE workspace_id = ?
            "#,
            settings.auto_save,
            settings.sync_on_startup,
            settings.default_timeout,
            settings.follow_redirects,
            settings.verify_ssl,
            settings.updated_at,
            settings.workspace_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Utility methods
    pub async fn get_workspace_summaries(&self) -> Result<Vec<WorkspaceSummary>> {
        let summaries = sqlx::query_as!(
            WorkspaceSummary,
            r#"
            SELECT 
                w.id,
                w.name,
                w.description,
                w.local_path,
                w.is_active,
                w.last_accessed_at,
                NULL as git_status,
                0 as collection_count,
                0 as request_count
            FROM workspaces w 
            ORDER BY w.last_accessed_at DESC, w.created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(summaries)
    }

    pub async fn workspace_exists(&self, id: &str) -> Result<bool> {
        let count: i64 = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM workspaces WHERE id = ?",
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(count > 0)
    }

    pub async fn close(&self) {
        self.pool.close().await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::workspace::CreateWorkspaceRequest;
    use tempfile::NamedTempFile;

    async fn create_test_db() -> DatabaseService {
        let temp_file = NamedTempFile::new().unwrap();
        let db_path = temp_file.path().to_str().unwrap();
        DatabaseService::new(db_path).await.unwrap()
    }

    #[tokio::test]
    async fn test_create_and_get_workspace() {
        let db = create_test_db().await;
        
        let request = CreateWorkspaceRequest {
            name: "Test Workspace".to_string(),
            description: Some("Test Description".to_string()),
            git_repository_url: None,
            local_path: "/tmp/test".to_string(),
        };

        let workspace = Workspace::new(request);
        let workspace_id = workspace.id.clone();

        // Create workspace
        db.create_workspace(&workspace).await.unwrap();

        // Get workspace
        let retrieved = db.get_workspace(&workspace_id).await.unwrap().unwrap();
        assert_eq!(retrieved.name, workspace.name);
        assert_eq!(retrieved.description, workspace.description);
        assert_eq!(retrieved.local_path, workspace.local_path);
    }

    #[tokio::test]
    async fn test_set_active_workspace() {
        let db = create_test_db().await;
        
        // Create two workspaces
        let workspace1 = Workspace::new(CreateWorkspaceRequest {
            name: "Workspace 1".to_string(),
            description: None,
            git_repository_url: None,
            local_path: "/tmp/test1".to_string(),
        });
        
        let workspace2 = Workspace::new(CreateWorkspaceRequest {
            name: "Workspace 2".to_string(),
            description: None,
            git_repository_url: None,
            local_path: "/tmp/test2".to_string(),
        });

        db.create_workspace(&workspace1).await.unwrap();
        db.create_workspace(&workspace2).await.unwrap();

        // Set workspace1 as active
        db.set_active_workspace(&workspace1.id).await.unwrap();
        
        let active = db.get_active_workspace().await.unwrap().unwrap();
        assert_eq!(active.id, workspace1.id);
        assert!(active.is_active);

        // Set workspace2 as active
        db.set_active_workspace(&workspace2.id).await.unwrap();
        
        let active = db.get_active_workspace().await.unwrap().unwrap();
        assert_eq!(active.id, workspace2.id);
        assert!(active.is_active);

        // Verify workspace1 is no longer active
        let workspace1_updated = db.get_workspace(&workspace1.id).await.unwrap().unwrap();
        assert!(!workspace1_updated.is_active);
    }
}