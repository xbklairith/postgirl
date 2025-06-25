import { invoke } from '@tauri-apps/api/core';
import type {
  Workspace,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceSettings,
  WorkspaceSummary
} from '../types/workspace';

// Database initialization
export async function initializeDatabase(databasePath: string): Promise<boolean> {
  return await invoke('workspace_initialize_database', { databasePath });
}

export async function runDatabaseMigrations(): Promise<string> {
  return await invoke('workspace_run_migrations');
}

// Workspace CRUD operations
export async function createWorkspace(request: CreateWorkspaceRequest): Promise<Workspace> {
  return await invoke('workspace_create', { request });
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  return await invoke('workspace_get', { id });
}

export async function getAllWorkspaces(): Promise<Workspace[]> {
  return await invoke('workspace_get_all');
}

export async function getActiveWorkspace(): Promise<Workspace | null> {
  return await invoke('workspace_get_active');
}

export async function updateWorkspace(request: UpdateWorkspaceRequest): Promise<boolean> {
  return await invoke('workspace_update', { request });
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  return await invoke('workspace_delete', { id });
}

export async function setActiveWorkspace(id: string): Promise<boolean> {
  return await invoke('workspace_set_active', { id });
}

export async function getWorkspaceSummaries(): Promise<WorkspaceSummary[]> {
  return await invoke('workspace_get_summaries');
}

export async function accessWorkspace(id: string): Promise<boolean> {
  return await invoke('workspace_access', { id });
}

// Workspace Settings operations
export async function createWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
  return await invoke('workspace_settings_create', { workspaceId });
}

export async function getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings | null> {
  return await invoke('workspace_settings_get', { workspaceId });
}

export async function updateWorkspaceSettings(settings: WorkspaceSettings): Promise<boolean> {
  return await invoke('workspace_settings_update', { settings });
}

// Git operations
export async function getGitStatus(repoPath: string) {
  return await invoke('git_get_status', { repoPath });
}

export async function checkGitRepository(path: string): Promise<boolean> {
  return await invoke('git_check_repository', { path });
}

// Directory validation
export async function checkDirectoryExists(path: string): Promise<boolean> {
  return await invoke('workspace_check_directory_exists', { path });
}