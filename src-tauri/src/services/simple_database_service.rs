use crate::models::workspace::{Workspace, WorkspaceSettings, WorkspaceSummary};
use anyhow::Result;
use chrono::{DateTime, Utc};
use sqlx::{migrate::MigrateDatabase, Sqlite, SqlitePool, Row};
use std::path::Path;

#[derive(Clone)]
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

        // Run migrations manually
        Self::run_migrations(&pool).await?;

        Ok(Self { pool })
    }

    async fn run_migrations(pool: &SqlitePool) -> Result<()> {
        // Create workspaces table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                git_repository_url TEXT,
                local_path TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_accessed_at TEXT
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_workspaces_active ON workspaces(is_active) WHERE is_active = 1")
            .execute(pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_workspaces_last_accessed ON workspaces(last_accessed_at DESC)")
            .execute(pool)
            .await?;

        // Create workspace_settings table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS workspace_settings (
                id TEXT PRIMARY KEY NOT NULL,
                workspace_id TEXT NOT NULL,
                auto_save BOOLEAN NOT NULL DEFAULT 1,
                sync_on_startup BOOLEAN NOT NULL DEFAULT 1,
                default_timeout INTEGER NOT NULL DEFAULT 30000,
                follow_redirects BOOLEAN NOT NULL DEFAULT 1,
                verify_ssl BOOLEAN NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_settings_workspace_id ON workspace_settings(workspace_id)")
            .execute(pool)
            .await?;

        // Create collections table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                folder_path TEXT,
                git_branch TEXT,
                is_active BOOLEAN NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create requests table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS requests (
                id TEXT PRIMARY KEY,
                collection_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                method TEXT NOT NULL,
                url TEXT NOT NULL,
                headers TEXT NOT NULL DEFAULT '{}',
                body TEXT,
                body_type TEXT NOT NULL DEFAULT 'json',
                auth_type TEXT,
                auth_config TEXT,
                follow_redirects BOOLEAN NOT NULL DEFAULT 1,
                timeout_ms INTEGER NOT NULL DEFAULT 30000,
                order_index INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create indexes for collections and requests
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_collections_workspace_id ON collections(workspace_id)")
            .execute(pool)
            .await?;
            
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_collections_is_active ON collections(is_active)")
            .execute(pool)
            .await?;
            
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_requests_collection_id ON requests(collection_id)")
            .execute(pool)
            .await?;
            
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_requests_order_index ON requests(order_index)")
            .execute(pool)
            .await?;

        Ok(())
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
        .bind(workspace.created_at.to_rfc3339())
        .bind(workspace.updated_at.to_rfc3339())
        .bind(workspace.last_accessed_at.map(|dt| dt.to_rfc3339()))
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_workspace(&self, id: &str) -> Result<Option<Workspace>> {
        let row = sqlx::query("SELECT * FROM workspaces WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            Ok(Some(self.row_to_workspace(row)?))
        } else {
            Ok(None)
        }
    }

    pub async fn get_all_workspaces(&self) -> Result<Vec<Workspace>> {
        let rows = sqlx::query("SELECT * FROM workspaces ORDER BY last_accessed_at DESC, created_at DESC")
            .fetch_all(&self.pool)
            .await?;

        let mut workspaces = Vec::new();
        for row in rows {
            workspaces.push(self.row_to_workspace(row)?);
        }
        Ok(workspaces)
    }

    pub async fn get_active_workspace(&self) -> Result<Option<Workspace>> {
        let row = sqlx::query("SELECT * FROM workspaces WHERE is_active = 1 LIMIT 1")
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            Ok(Some(self.row_to_workspace(row)?))
        } else {
            Ok(None)
        }
    }

    pub async fn update_workspace(&self, workspace: &Workspace) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE workspaces SET 
                name = ?, description = ?, git_repository_url = ?, 
                local_path = ?, is_active = ?, updated_at = ?, last_accessed_at = ?
            WHERE id = ?
            "#
        )
        .bind(&workspace.name)
        .bind(&workspace.description)
        .bind(&workspace.git_repository_url)
        .bind(&workspace.local_path)
        .bind(workspace.is_active)
        .bind(workspace.updated_at.to_rfc3339())
        .bind(workspace.last_accessed_at.map(|dt| dt.to_rfc3339()))
        .bind(&workspace.id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn delete_workspace(&self, id: &str) -> Result<()> {
        // Delete related settings first
        sqlx::query("DELETE FROM workspace_settings WHERE workspace_id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        // Delete workspace
        sqlx::query("DELETE FROM workspaces WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn set_active_workspace(&self, id: &str) -> Result<()> {
        // First deactivate all workspaces
        sqlx::query("UPDATE workspaces SET is_active = 0, updated_at = ?")
            .bind(Utc::now().to_rfc3339())
            .execute(&self.pool)
            .await?;

        // Then activate the specified workspace and update last_accessed_at
        let now = Utc::now();
        sqlx::query(
            "UPDATE workspaces SET is_active = 1, last_accessed_at = ?, updated_at = ? WHERE id = ?"
        )
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn workspace_exists(&self, id: &str) -> Result<bool> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM workspaces WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

        let count: i64 = row.get("count");
        Ok(count > 0)
    }

    pub async fn get_workspace_summaries(&self) -> Result<Vec<WorkspaceSummary>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                id, name, description, local_path, is_active, last_accessed_at
            FROM workspaces 
            ORDER BY last_accessed_at DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut summaries = Vec::new();
        for row in rows {
            let last_accessed_at_str: Option<String> = row.get("last_accessed_at");
            summaries.push(WorkspaceSummary {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                local_path: row.get("local_path"),
                is_active: row.get("is_active"),
                last_accessed_at: last_accessed_at_str
                    .map(|s| DateTime::parse_from_rfc3339(&s).map(|dt| dt.with_timezone(&Utc)))
                    .transpose()?,
                git_status: None,
                collection_count: 0,
                request_count: 0,
            });
        }
        Ok(summaries)
    }

    // Workspace Settings operations
    pub async fn create_workspace_settings(&self, settings: &WorkspaceSettings) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO workspace_settings (
                id, workspace_id, auto_save, sync_on_startup, default_timeout,
                follow_redirects, verify_ssl, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&settings.id)
        .bind(&settings.workspace_id)
        .bind(settings.auto_save)
        .bind(settings.sync_on_startup)
        .bind(settings.default_timeout as i64)
        .bind(settings.follow_redirects)
        .bind(settings.verify_ssl)
        .bind(settings.created_at.to_rfc3339())
        .bind(settings.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_workspace_settings(&self, workspace_id: &str) -> Result<Option<WorkspaceSettings>> {
        let row = sqlx::query("SELECT * FROM workspace_settings WHERE workspace_id = ?")
            .bind(workspace_id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            Ok(Some(self.row_to_workspace_settings(row)?))
        } else {
            Ok(None)
        }
    }

    pub async fn update_workspace_settings(&self, settings: &WorkspaceSettings) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE workspace_settings SET 
                auto_save = ?, sync_on_startup = ?, default_timeout = ?,
                follow_redirects = ?, verify_ssl = ?, updated_at = ?
            WHERE workspace_id = ?
            "#
        )
        .bind(settings.auto_save)
        .bind(settings.sync_on_startup)
        .bind(settings.default_timeout as i64)
        .bind(settings.follow_redirects)
        .bind(settings.verify_ssl)
        .bind(settings.updated_at.to_rfc3339())
        .bind(&settings.workspace_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Helper method to convert row to workspace
    fn row_to_workspace(&self, row: sqlx::sqlite::SqliteRow) -> Result<Workspace> {
        let created_at_str: String = row.get("created_at");
        let updated_at_str: String = row.get("updated_at");
        let last_accessed_at_str: Option<String> = row.get("last_accessed_at");

        Ok(Workspace {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            git_repository_url: row.get("git_repository_url"),
            local_path: row.get("local_path"),
            is_active: row.get("is_active"),
            created_at: DateTime::parse_from_rfc3339(&created_at_str)?.with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&updated_at_str)?.with_timezone(&Utc),
            last_accessed_at: last_accessed_at_str
                .map(|s| DateTime::parse_from_rfc3339(&s).map(|dt| dt.with_timezone(&Utc)))
                .transpose()?,
        })
    }

    // Helper method to convert row to workspace settings
    fn row_to_workspace_settings(&self, row: sqlx::sqlite::SqliteRow) -> Result<WorkspaceSettings> {
        let created_at_str: String = row.get("created_at");
        let updated_at_str: String = row.get("updated_at");
        let default_timeout: i64 = row.get("default_timeout");

        Ok(WorkspaceSettings {
            id: row.get("id"),
            workspace_id: row.get("workspace_id"),
            auto_save: row.get("auto_save"),
            sync_on_startup: row.get("sync_on_startup"),
            default_timeout: default_timeout as u32,
            follow_redirects: row.get("follow_redirects"),
            verify_ssl: row.get("verify_ssl"),
            created_at: DateTime::parse_from_rfc3339(&created_at_str)?.with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&updated_at_str)?.with_timezone(&Utc),
        })
    }

    pub async fn close(&self) {
        self.pool.close().await;
    }

    pub fn get_pool(&self) -> SqlitePool {
        self.pool.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::workspace::CreateWorkspaceRequest;

    async fn create_test_db() -> DatabaseService {
        // Use in-memory database for tests
        DatabaseService::new("sqlite::memory:").await.unwrap()
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