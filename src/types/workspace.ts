// TypeScript types matching Rust workspace models

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  git_repository_url?: string;
  local_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  git_repository_url?: string;
  local_path: string;
}

export interface UpdateWorkspaceRequest {
  id: string;
  name?: string;
  description?: string;
  git_repository_url?: string;
  local_path?: string;
  is_active?: boolean;
}

export interface WorkspaceSettings {
  id: string;
  workspace_id: string;
  auto_save: boolean;
  sync_on_startup: boolean;
  default_timeout: number;
  follow_redirects: boolean;
  verify_ssl: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  description?: string;
  local_path: string;
  is_active: boolean;
  last_accessed_at?: string;
  git_status?: string;
  collection_count: number;
  request_count: number;
}

export interface GitStatus {
  current_branch: string;
  is_clean: boolean;
  staged_files: string[];
  modified_files: string[];
  untracked_files: string[];
  ahead: number;
  behind: number;
}