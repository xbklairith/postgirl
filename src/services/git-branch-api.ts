import { invoke } from '@tauri-apps/api/core';
import type {
  BranchConfig,
  BranchCreateRequest,
  BranchCreateResult,
  BranchPattern,
  BranchHistoryEntry,
  FeatureType,
  GitBranch,
  SystemInfo,
} from '../types/git';

class GitBranchApiService {
  private initialized = false;

  async initializeService(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await invoke('init_git_branch_service');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize git branch service:', error);
      throw error;
    }
  }

  async getSystemInfo(): Promise<SystemInfo> {
    await this.initializeService();
    return await invoke('get_system_info');
  }

  async getBranchConfig(): Promise<BranchConfig> {
    await this.initializeService();
    return await invoke('get_branch_config');
  }

  async updateBranchConfig(config: BranchConfig): Promise<void> {
    await this.initializeService();
    return await invoke('update_branch_config', { config });
  }

  async generateBranchName(pattern: BranchPattern): Promise<string> {
    await this.initializeService();
    return await invoke('generate_branch_name', { pattern });
  }

  async suggestBranchPattern(
    workspaceName: string,
    featureType?: FeatureType
  ): Promise<BranchPattern> {
    await this.initializeService();
    return await invoke('suggest_branch_pattern', {
      workspaceName,
      featureType,
    });
  }

  async createBranch(
    workspacePath: string,
    request: BranchCreateRequest
  ): Promise<BranchCreateResult> {
    await this.initializeService();
    return await invoke('create_branch', { workspacePath, request });
  }

  async quickCreateFeatureBranch(
    workspacePath: string,
    workspaceName: string,
    description: string,
    featureType?: FeatureType
  ): Promise<BranchCreateResult> {
    await this.initializeService();
    return await invoke('quick_create_feature_branch', {
      workspacePath,
      workspaceName,
      description,
      featureType,
    });
  }

  async listBranches(workspacePath: string): Promise<GitBranch[]> {
    await this.initializeService();
    return await invoke('list_branches', { workspacePath });
  }

  async getBranchHistory(limit?: number): Promise<BranchHistoryEntry[]> {
    await this.initializeService();
    const history = await invoke('get_branch_history', { limit });
    
    // Transform the response to match our interface
    return (history as any[]).map(([branchName, pattern, createdAt]) => ({
      branch_name: branchName,
      pattern,
      created_at: createdAt,
    }));
  }

  async getSuggestedBranches(workspaceName: string): Promise<Array<{ featureType: FeatureType; branchName: string }>> {
    await this.initializeService();
    const suggestions = await invoke('get_suggested_branches', { workspaceName });
    
    // Transform the response to match our interface
    return (suggestions as any[]).map(([featureType, branchName]) => ({
      featureType,
      branchName,
    }));
  }

  // Utility methods for common operations
  async canCreateBranch(workspacePath: string, pattern: BranchPattern): Promise<{ canCreate: boolean; reason?: string }> {
    try {
      const branchName = await this.generateBranchName(pattern);
      const branches = await this.listBranches(workspacePath);
      const exists = branches.some(branch => branch.name === branchName);
      
      if (exists) {
        return {
          canCreate: false,
          reason: `Branch '${branchName}' already exists`
        };
      }
      
      return { canCreate: true };
    } catch (error) {
      return {
        canCreate: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getCurrentBranch(workspacePath: string): Promise<GitBranch | null> {
    const branches = await this.listBranches(workspacePath);
    return branches.find(branch => branch.is_current) || null;
  }

  async getRecentBranches(limit: number = 10): Promise<BranchHistoryEntry[]> {
    return await this.getBranchHistory(limit);
  }

  // Validation methods
  validatePattern(pattern: BranchPattern): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!pattern.workspace.trim()) {
      errors.push('Workspace name is required');
    }

    if (!pattern.username.trim()) {
      errors.push('Username is required');
    }

    if (!pattern.machine.trim()) {
      errors.push('Machine name is required');
    }

    if (!pattern.feature_type) {
      errors.push('Feature type is required');
    }

    if (pattern.description && pattern.description.length > 50) {
      errors.push('Description should be 50 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateBranchConfig(config: BranchConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.branch_prefix_pattern.trim()) {
      errors.push('Branch prefix pattern is required');
    }

    if (!config.branch_prefix_pattern.includes('{workspace}')) {
      errors.push('Branch prefix pattern must include {workspace}');
    }

    if (!config.branch_prefix_pattern.includes('{username}')) {
      errors.push('Branch prefix pattern must include {username}');
    }

    if (!config.branch_prefix_pattern.includes('{machine}')) {
      errors.push('Branch prefix pattern must include {machine}');
    }

    if (!config.branch_prefix_pattern.includes('{feature}')) {
      errors.push('Branch prefix pattern must include {feature}');
    }

    if (config.max_branch_name_length < 10 || config.max_branch_name_length > 200) {
      errors.push('Maximum branch name length must be between 10 and 200 characters');
    }

    if (config.allowed_feature_types.length === 0) {
      errors.push('At least one feature type must be allowed');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const GitBranchApi = new GitBranchApiService();