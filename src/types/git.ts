export type FeatureType = 
  | 'feature'
  | 'bugfix'
  | 'hotfix'
  | 'experiment'
  | 'refactor'
  | 'docs';

// Basic Git types
export interface GitCredentials {
  username: string;
  password: string;
  ssh_key_path?: string;
}

export interface CloneResult {
  success: boolean;
  path: string;
  message: string;
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

export interface Branch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  last_commit: string;
  last_commit_message: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  files_changed: number;
}

export interface GitRemote {
  name: string;
  url: string;
}

export interface BranchPattern {
  workspace: string;
  username: string;
  machine: string;
  feature_type: FeatureType;
  description?: string;
}

export interface SystemInfo {
  username: string;
  machine_name: string;
  os_type: string;
}

export interface BranchConfig {
  auto_create_branches: boolean;
  default_feature_type: FeatureType;
  branch_prefix_pattern: string;
  max_branch_name_length: number;
  allowed_feature_types: FeatureType[];
}

export interface GitBranch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  last_commit_hash?: string;
  last_commit_message?: string;
  last_commit_date?: string;
  ahead_count?: number;
  behind_count?: number;
}

export interface BranchCreateRequest {
  pattern: BranchPattern;
  base_branch?: string;
  auto_switch: boolean;
}

export interface BranchCreateResult {
  branch_name: string;
  created: boolean;
  switched: boolean;
  message: string;
}

export interface BranchHistoryEntry {
  branch_name: string;
  pattern: BranchPattern;
  created_at: string;
}

// Helper functions
export const getFeatureTypeColor = (type: FeatureType): string => {
  switch (type) {
    case 'feature':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'bugfix':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    case 'hotfix':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
    case 'experiment':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    case 'refactor':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    case 'docs':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
};

export const getFeatureTypeIcon = (type: FeatureType): string => {
  switch (type) {
    case 'feature':
      return '✨';
    case 'bugfix':
      return '🐛';
    case 'hotfix':
      return '🚨';
    case 'experiment':
      return '🧪';
    case 'refactor':
      return '♻️';
    case 'docs':
      return '📚';
    default:
      return '📝';
  }
};

export const formatBranchName = (pattern: BranchPattern): string => {
  const { workspace, username, machine, feature_type, description } = pattern;
  const sanitized = {
    workspace: workspace.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    username: username.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    machine: machine.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    description: description?.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  };

  let branchName = `${sanitized.workspace}/${sanitized.username}-${sanitized.machine}/${feature_type}`;
  
  if (sanitized.description) {
    branchName += `-${sanitized.description}`;
  }

  return branchName;
};

export const createDefaultBranchConfig = (): BranchConfig => ({
  auto_create_branches: true,
  default_feature_type: 'feature',
  branch_prefix_pattern: '{workspace}/{username}-{machine}/{feature}',
  max_branch_name_length: 100,
  allowed_feature_types: ['feature', 'bugfix', 'hotfix', 'experiment', 'refactor', 'docs']
});

export const createDefaultBranchPattern = (
  workspace: string,
  systemInfo: SystemInfo,
  featureType: FeatureType = 'feature'
): BranchPattern => ({
  workspace,
  username: systemInfo.username,
  machine: systemInfo.machine_name,
  feature_type: featureType,
  description: undefined
});