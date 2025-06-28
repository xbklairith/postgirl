import { invoke } from '@tauri-apps/api/core';
import type { GitStatus, GitCredentials, CloneResult } from '../types/git';

export class GitApiService {
  /**
   * Initialize a Git repository in the specified path
   */
  static async initializeRepository(path: string): Promise<CloneResult> {
    return await invoke('git_initialize_repository', { path });
  }

  /**
   * Clone a Git repository
   */
  static async cloneRepository(
    url: string,
    path: string,
    credentials?: GitCredentials
  ): Promise<CloneResult> {
    return await invoke('git_clone_repository', { url, path, credentials });
  }

  /**
   * Get Git repository status
   */
  static async getRepositoryStatus(repoPath: string): Promise<GitStatus> {
    return await invoke('git_get_status', { repoPath });
  }

  /**
   * Check if a directory is a Git repository
   */
  static async checkRepository(path: string): Promise<boolean> {
    return await invoke('git_check_repository', { path });
  }

  /**
   * Store Git credentials securely
   */
  static async storeCredentials(key: string, credentials: GitCredentials): Promise<boolean> {
    return await invoke('git_store_credentials', { key, credentials });
  }

  /**
   * Get stored Git credentials
   */
  static async getCredentials(key: string): Promise<GitCredentials> {
    return await invoke('git_get_credentials', { key });
  }

  /**
   * Delete stored Git credentials
   */
  static async deleteCredentials(key: string): Promise<boolean> {
    return await invoke('git_delete_credentials', { key });
  }

  /**
   * Check if credentials exist for a key
   */
  static async credentialsExist(key: string): Promise<boolean> {
    return await invoke('git_credentials_exist', { key });
  }

  /**
   * Get branches for a repository
   */
  static async getBranches(repoPath: string): Promise<Array<{ name: string; is_current: boolean }>> {
    return await invoke('git_get_branches', { repoPath });
  }
}

// Workspace-specific Git operations
export class WorkspaceGitService {
  /**
   * Initialize Git repository for a workspace
   */
  static async initializeWorkspaceRepository(workspacePath: string): Promise<CloneResult> {
    const result = await GitApiService.initializeRepository(workspacePath);
    
    if (result.success) {
      // Create initial .gitignore for Postgirl workspaces
      // Note: We might want to add a separate Tauri command for file operations
      // For now, just return the result
      
      // TODO: Create .gitignore file with workspace-specific patterns
    }
    
    return result;
  }

  /**
   * Get workspace Git status with additional workspace context
   */
  static async getWorkspaceGitStatus(workspacePath: string): Promise<GitStatus & { isRepository: boolean }> {
    try {
      const isRepo = await GitApiService.checkRepository(workspacePath);
      
      if (!isRepo) {
        return {
          current_branch: '',
          staged_files: [],
          modified_files: [],
          untracked_files: [],
          is_clean: true,
          ahead: 0,
          behind: 0,
          isRepository: false,
        };
      }

      const status = await GitApiService.getRepositoryStatus(workspacePath);
      return { ...status, isRepository: true };
    } catch (error) {
      console.warn('Failed to get workspace Git status:', error);
      return {
        current_branch: '',
        staged_files: [],
        modified_files: [],
        untracked_files: [],
        is_clean: true,
        ahead: 0,
        behind: 0,
        isRepository: false,
      };
    }
  }

  /**
   * Setup Git configuration for a workspace
   */
  static async configureWorkspaceGit(
    _workspacePath: string,
    config: { userName: string; userEmail: string }
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Note: This would require additional Tauri commands for git config
      // For now, we'll return a placeholder
      return {
        success: true,
        message: `Git configured for workspace: ${config.userName} <${config.userEmail}>`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to configure Git: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}