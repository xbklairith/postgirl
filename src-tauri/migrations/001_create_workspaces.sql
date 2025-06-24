-- Create workspaces table
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    git_repository_url TEXT,
    local_path TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    last_accessed_at TIMESTAMP
);

-- Create index on active workspaces for fast lookup
CREATE INDEX idx_workspaces_active ON workspaces(is_active) WHERE is_active = 1;

-- Create index on last_accessed_at for recent workspaces
CREATE INDEX idx_workspaces_last_accessed ON workspaces(last_accessed_at DESC);

-- Create workspace_settings table
CREATE TABLE workspace_settings (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL,
    auto_save BOOLEAN NOT NULL DEFAULT 1,
    sync_on_startup BOOLEAN NOT NULL DEFAULT 1,
    default_timeout INTEGER NOT NULL DEFAULT 30000,
    follow_redirects BOOLEAN NOT NULL DEFAULT 1,
    verify_ssl BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Create unique index on workspace_id to ensure one settings per workspace
CREATE UNIQUE INDEX idx_workspace_settings_workspace_id ON workspace_settings(workspace_id);