use crate::models::collection::{
    Collection, Request, CreateCollectionRequest, UpdateCollectionRequest,
    CreateRequestRequest, UpdateRequestRequest, CollectionSummary,
};
use sqlx::{SqlitePool, Row};
use anyhow::{Result, anyhow};

pub struct CollectionService {
    pool: SqlitePool,
}

impl CollectionService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    // Collection CRUD operations
    pub async fn create_collection(&self, request: CreateCollectionRequest) -> Result<Collection> {
        let collection = Collection::new(request);
        
        sqlx::query(
            r#"
            INSERT INTO collections (id, workspace_id, name, description, folder_path, git_branch, is_active, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            "#
        )
        .bind(&collection.id)
        .bind(&collection.workspace_id)
        .bind(&collection.name)
        .bind(&collection.description)
        .bind(&collection.folder_path)
        .bind(&collection.git_branch)
        .bind(collection.is_active)
        .bind(&collection.created_at.to_rfc3339())
        .bind(&collection.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await
        .map_err(|e| anyhow!("Failed to create collection: {}", e))?;

        Ok(collection)
    }

    pub async fn get_collection(&self, id: &str) -> Result<Option<Collection>> {
        let row = sqlx::query(
            "SELECT * FROM collections WHERE id = ?1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| anyhow!("Failed to get collection: {}", e))?;

        if let Some(row) = row {
            Ok(Some(Collection {
                id: row.get("id"),
                workspace_id: row.get("workspace_id"),
                name: row.get("name"),
                description: row.get("description"),
                folder_path: row.get("folder_path"),
                git_branch: row.get("git_branch"),
                is_active: row.get::<i64, _>("is_active") != 0,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&chrono::Utc),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn update_collection(&self, request: UpdateCollectionRequest) -> Result<Collection> {
        let mut collection = self.get_collection(&request.id).await?
            .ok_or_else(|| anyhow!("Collection not found"))?;
        
        collection.update(request);

        sqlx::query(
            r#"
            UPDATE collections 
            SET name = ?1, description = ?2, folder_path = ?3, git_branch = ?4, is_active = ?5, updated_at = ?6
            WHERE id = ?7
            "#
        )
        .bind(&collection.name)
        .bind(&collection.description)
        .bind(&collection.folder_path)
        .bind(&collection.git_branch)
        .bind(collection.is_active)
        .bind(&collection.updated_at.to_rfc3339())
        .bind(&collection.id)
        .execute(&self.pool)
        .await
        .map_err(|e| anyhow!("Failed to update collection: {}", e))?;

        Ok(collection)
    }

    pub async fn delete_collection(&self, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM collections WHERE id = ?1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| anyhow!("Failed to delete collection: {}", e))?;

        Ok(())
    }

    pub async fn list_collections(&self, workspace_id: &str) -> Result<Vec<Collection>> {
        let rows = sqlx::query(
            "SELECT * FROM collections WHERE workspace_id = ?1 ORDER BY updated_at DESC"
        )
        .bind(workspace_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| anyhow!("Failed to list collections: {}", e))?;

        let mut collections = Vec::new();
        for row in rows {
            collections.push(Collection {
                id: row.get("id"),
                workspace_id: row.get("workspace_id"),
                name: row.get("name"),
                description: row.get("description"),
                folder_path: row.get("folder_path"),
                git_branch: row.get("git_branch"),
                is_active: row.get::<i64, _>("is_active") != 0,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&chrono::Utc),
            });
        }

        Ok(collections)
    }

    pub async fn get_collection_summaries(&self, workspace_id: &str) -> Result<Vec<CollectionSummary>> {
        let rows = sqlx::query(
            r#"
            SELECT 
                c.id, c.workspace_id, c.name, c.description, c.folder_path, c.git_branch, c.is_active, c.created_at, c.updated_at,
                COUNT(r.id) as request_count
            FROM collections c
            LEFT JOIN requests r ON c.id = r.collection_id
            WHERE c.workspace_id = ?1
            GROUP BY c.id
            ORDER BY c.updated_at DESC
            "#
        )
        .bind(workspace_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| anyhow!("Failed to get collection summaries: {}", e))?;

        let mut summaries = Vec::new();
        for row in rows {
            summaries.push(CollectionSummary {
                id: row.get("id"),
                workspace_id: row.get("workspace_id"),
                name: row.get("name"),
                description: row.get("description"),
                folder_path: row.get("folder_path"),
                git_branch: row.get("git_branch"),
                is_active: row.get::<i64, _>("is_active") != 0,
                request_count: row.get::<i64, _>("request_count"),
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&chrono::Utc),
            });
        }

        Ok(summaries)
    }

    // Request CRUD operations
    pub async fn create_request(&self, request: CreateRequestRequest) -> Result<Request> {
        let req = Request::new(request);
        
        sqlx::query(
            r#"
            INSERT INTO requests (
                id, collection_id, name, description, method, url, headers, body, body_type,
                auth_type, auth_config, follow_redirects, timeout_ms, order_index, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
            "#
        )
        .bind(&req.id)
        .bind(&req.collection_id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.method)
        .bind(&req.url)
        .bind(&req.headers)
        .bind(&req.body)
        .bind(&req.body_type)
        .bind(&req.auth_type)
        .bind(&req.auth_config)
        .bind(req.follow_redirects)
        .bind(req.timeout_ms as i64)
        .bind(req.order_index)
        .bind(&req.created_at.to_rfc3339())
        .bind(&req.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await
        .map_err(|e| anyhow!("Failed to create request: {}", e))?;

        Ok(req)
    }

    pub async fn get_request(&self, id: &str) -> Result<Option<Request>> {
        let row = sqlx::query("SELECT * FROM requests WHERE id = ?1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| anyhow!("Failed to get request: {}", e))?;

        if let Some(row) = row {
            Ok(Some(Request {
                id: row.get("id"),
                collection_id: row.get("collection_id"),
                name: row.get("name"),
                description: row.get("description"),
                method: row.get("method"),
                url: row.get("url"),
                headers: row.get("headers"),
                body: row.get("body"),
                body_type: row.get("body_type"),
                auth_type: row.get("auth_type"),
                auth_config: row.get("auth_config"),
                follow_redirects: row.get::<i64, _>("follow_redirects") != 0,
                timeout_ms: row.get::<i64, _>("timeout_ms") as u32,
                order_index: row.get("order_index"),
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&chrono::Utc),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn update_request(&self, request: UpdateRequestRequest) -> Result<Request> {
        let mut req = self.get_request(&request.id).await?
            .ok_or_else(|| anyhow!("Request not found"))?;
        
        req.update(request);

        sqlx::query(
            r#"
            UPDATE requests 
            SET collection_id = ?1, name = ?2, description = ?3, method = ?4, url = ?5, headers = ?6, body = ?7, 
                body_type = ?8, auth_type = ?9, auth_config = ?10, follow_redirects = ?11, 
                timeout_ms = ?12, order_index = ?13, updated_at = ?14
            WHERE id = ?15
            "#
        )
        .bind(&req.collection_id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.method)
        .bind(&req.url)
        .bind(&req.headers)
        .bind(&req.body)
        .bind(&req.body_type)
        .bind(&req.auth_type)
        .bind(&req.auth_config)
        .bind(req.follow_redirects)
        .bind(req.timeout_ms as i64)
        .bind(req.order_index)
        .bind(&req.updated_at.to_rfc3339())
        .bind(&req.id)
        .execute(&self.pool)
        .await
        .map_err(|e| anyhow!("Failed to update request: {}", e))?;

        Ok(req)
    }

    pub async fn delete_request(&self, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM requests WHERE id = ?1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| anyhow!("Failed to delete request: {}", e))?;

        Ok(())
    }

    pub async fn list_requests(&self, collection_id: &str) -> Result<Vec<Request>> {
        let rows = sqlx::query(
            "SELECT * FROM requests WHERE collection_id = ?1 ORDER BY order_index ASC, created_at ASC"
        )
        .bind(collection_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| anyhow!("Failed to list requests: {}", e))?;

        let mut requests = Vec::new();
        for row in rows {
            requests.push(Request {
                id: row.get("id"),
                collection_id: row.get("collection_id"),
                name: row.get("name"),
                description: row.get("description"),
                method: row.get("method"),
                url: row.get("url"),
                headers: row.get("headers"),
                body: row.get("body"),
                body_type: row.get("body_type"),
                auth_type: row.get("auth_type"),
                auth_config: row.get("auth_config"),
                follow_redirects: row.get::<i64, _>("follow_redirects") != 0,
                timeout_ms: row.get::<i64, _>("timeout_ms") as u32,
                order_index: row.get("order_index"),
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?.with_timezone(&chrono::Utc),
            });
        }

        Ok(requests)
    }

    pub async fn duplicate_request(&self, id: &str, new_name: &str) -> Result<Request> {
        let original = self.get_request(id).await?
            .ok_or_else(|| anyhow!("Request not found"))?;

        let headers = original.get_headers().ok();
        let auth_config = original.get_auth_config().ok().flatten();

        let request = CreateRequestRequest {
            collection_id: original.collection_id.clone(),
            name: new_name.to_string(),
            description: original.description.clone(),
            method: original.method.clone(),
            url: original.url.clone(),
            headers,
            body: original.body.clone(),
            body_type: Some(original.body_type.clone()),
            auth_type: original.auth_type.clone(),
            auth_config,
            follow_redirects: Some(original.follow_redirects),
            timeout_ms: Some(original.timeout_ms),
            order_index: Some(original.order_index + 1),
        };

        self.create_request(request).await
    }

    pub async fn reorder_requests(&self, collection_id: &str, request_orders: Vec<(String, i32)>) -> Result<()> {
        let mut transaction = self.pool.begin().await?;

        for (request_id, order_index) in request_orders {
            sqlx::query(
                "UPDATE requests SET order_index = ?1, updated_at = ?2 WHERE id = ?3 AND collection_id = ?4"
            )
            .bind(order_index)
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&request_id)
            .bind(collection_id)
            .execute(&mut *transaction)
            .await
            .map_err(|e| anyhow!("Failed to update request order: {}", e))?;
        }

        transaction.commit().await?;
        Ok(())
    }
}