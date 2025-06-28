import { WorkspaceGitService } from './git-api';

// Re-export for convenience
export { WorkspaceGitService };
import * as workspaceApi from './workspace-api';
import type { CreateWorkspaceRequest, Workspace } from '../types/workspace';

export interface CreateWorkspaceWithGitRequest extends CreateWorkspaceRequest {
  initializeGit?: boolean;
  gitConfig?: {
    userName: string;
    userEmail: string;
  };
}

export class WorkspaceGitIntegration {
  /**
   * Create a workspace with optional Git initialization
   */
  static async createWorkspaceWithGit(request: CreateWorkspaceWithGitRequest): Promise<{
    workspace: Workspace;
    gitResult?: {
      initialized: boolean;
      configured: boolean;
      message: string;
    };
  }> {
    // Create the workspace first
    const workspace = await workspaceApi.createWorkspace({
      name: request.name,
      description: request.description,
      git_repository_url: request.git_repository_url,
      local_path: request.local_path,
    });

    let gitResult;

    // Initialize Git if requested and no repository URL is provided
    if (request.initializeGit && !request.git_repository_url && workspace.local_path) {
      try {
        // Initialize Git repository
        const initResult = await WorkspaceGitService.initializeWorkspaceRepository(workspace.local_path);
        
        let configured = false;
        let configMessage = '';

        // Configure Git if config is provided
        if (request.gitConfig && initResult.success) {
          const configResult = await WorkspaceGitService.configureWorkspaceGit(
            workspace.local_path,
            request.gitConfig
          );
          configured = configResult.success;
          configMessage = configResult.message;
        }

        gitResult = {
          initialized: initResult.success,
          configured,
          message: initResult.success 
            ? `Git repository initialized successfully. ${configMessage}`
            : `Failed to initialize Git: ${initResult.message}`,
        };
      } catch (error) {
        gitResult = {
          initialized: false,
          configured: false,
          message: `Git initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }

    return { workspace, gitResult };
  }

  /**
   * Get workspace Git status with caching
   */
  static async getWorkspaceStatus(workspacePath: string) {
    return await WorkspaceGitService.getWorkspaceGitStatus(workspacePath);
  }

  /**
   * Check if workspace should have Git initialized
   */
  static shouldInitializeGit(request: CreateWorkspaceRequest): boolean {
    // Don't initialize if there's already a Git URL (clone instead)
    if (request.git_repository_url) {
      return false;
    }

    // Initialize for local workspaces
    return !!request.local_path;
  }

  /**
   * Suggest Git configuration based on system
   */
  static async suggestGitConfig(): Promise<{ userName: string; userEmail: string } | null> {
    try {
      // In a real implementation, this could try to read global Git config
      // For now, return null to let user configure manually
      return null;
    } catch (error) {
      console.warn('Failed to suggest Git config:', error);
      return null;
    }
  }
}