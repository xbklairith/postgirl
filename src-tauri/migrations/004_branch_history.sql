-- Migration to add branch history tracking table
-- This stores information about automatically created branches for analytics and suggestions

CREATE TABLE branch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_name TEXT NOT NULL,
    pattern_json TEXT NOT NULL,  -- JSON serialized BranchPattern
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    workspace_name TEXT,
    feature_type TEXT,
    username TEXT,
    machine_name TEXT
);

-- Index for efficient querying
CREATE INDEX idx_branch_history_created_at ON branch_history(created_at);
CREATE INDEX idx_branch_history_workspace ON branch_history(workspace_name);
CREATE INDEX idx_branch_history_feature_type ON branch_history(feature_type);
CREATE INDEX idx_branch_history_username ON branch_history(username);

-- Table for storing branch configuration per workspace
CREATE TABLE branch_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL,
    config_json TEXT NOT NULL,  -- JSON serialized BranchConfig
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Unique constraint to ensure one config per workspace
CREATE UNIQUE INDEX idx_branch_configs_workspace ON branch_configs(workspace_id);