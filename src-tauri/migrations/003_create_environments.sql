-- Create environments table
CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    UNIQUE(workspace_id, name)
);

-- Create environment_variables table
CREATE TABLE IF NOT EXISTS environment_variables (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    environment_id TEXT NOT NULL,
    variable_key TEXT NOT NULL,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT FALSE,
    variable_type TEXT DEFAULT 'string' CHECK (variable_type IN ('string', 'secret')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (environment_id) REFERENCES environments (id) ON DELETE CASCADE,
    UNIQUE(environment_id, variable_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_environments_workspace_id ON environments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_environments_active ON environments(workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_environment_variables_environment_id ON environment_variables(environment_id);