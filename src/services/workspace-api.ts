import { invoke } from '@tauri-apps/api/core';

// Safe invoke wrapper that handles missing Tauri context
const safeInvoke = async (command: string, args?: any) => {
  try {
    // Check if Tauri is available
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      return await invoke(command, args);
    } else if (typeof window !== 'undefined' && (window as any).invoke) {
      return await (window as any).invoke(command, args);
    } else {
      throw new Error('Tauri API not available - running in browser test environment');
    }
  } catch (error) {
    console.error(`Tauri command '${command}' failed:`, error);
    throw error;
  }
};
import type {
  Workspace,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceSettings,
  WorkspaceSummary
} from '../types/workspace';

// Database initialization
export async function initializeDatabase(databasePath: string): Promise<boolean> {
  return await safeInvoke('workspace_initialize_database', { databasePath });
}

export async function runDatabaseMigrations(): Promise<string> {
  return await safeInvoke('workspace_run_migrations');
}

// Workspace CRUD operations
export async function createWorkspace(request: CreateWorkspaceRequest): Promise<Workspace> {
  return await safeInvoke('workspace_create', { request });
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  return await safeInvoke('workspace_get', { id });
}

export async function getAllWorkspaces(): Promise<Workspace[]> {
  return await safeInvoke('workspace_get_all');
}

export async function getActiveWorkspace(): Promise<Workspace | null> {
  return await safeInvoke('workspace_get_active');
}

export async function updateWorkspace(request: UpdateWorkspaceRequest): Promise<boolean> {
  return await safeInvoke('workspace_update', { request });
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  return await safeInvoke('workspace_delete', { id });
}

export async function setActiveWorkspace(id: string): Promise<boolean> {
  return await safeInvoke('workspace_set_active', { id });
}

export async function getWorkspaceSummaries(): Promise<WorkspaceSummary[]> {
  return await safeInvoke('workspace_get_summaries');
}

export async function accessWorkspace(id: string): Promise<boolean> {
  return await safeInvoke('workspace_access', { id });
}

// Workspace Settings operations
export async function createWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
  return await safeInvoke('workspace_settings_create', { workspaceId });
}

export async function getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings | null> {
  return await safeInvoke('workspace_settings_get', { workspaceId });
}

export async function updateWorkspaceSettings(settings: WorkspaceSettings): Promise<boolean> {
  return await safeInvoke('workspace_settings_update', { settings });
}

// Git operations
export async function getGitStatus(repoPath: string) {
  return await safeInvoke('git_get_status', { repoPath });
}

export async function checkGitRepository(path: string): Promise<boolean> {
  return await safeInvoke('git_check_repository', { path });
}

// Directory validation
export async function checkDirectoryExists(path: string): Promise<boolean> {
  return await safeInvoke('workspace_check_directory_exists', { path });
}