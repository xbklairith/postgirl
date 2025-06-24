# 03-CODEBASE_GUIDE.md
## System Architecture and Code Organization

### Project Structure Overview

```
postgirl-desktop/
├── src/                        # Frontend React application
│   ├── components/             # Reusable UI components
│   │   ├── ui/                # Base design system components
│   │   ├── request/           # Request builder components
│   │   ├── response/          # Response viewer components
│   │   ├── workspace/         # Workspace management UI
│   │   ├── environment/       # Environment management
│   │   ├── collection/        # Collection browser & editor
│   │   ├── git/              # Git operation UI components
│   │   └── common/           # Shared component utilities
│   ├── stores/                # Zustand state management
│   │   ├── workspace.ts       # Workspace state & actions
│   │   ├── request.ts         # Request execution state
│   │   ├── environment.ts     # Environment management
│   │   ├── git.ts            # Git operations state
│   │   └── ui.ts             # UI state (panels, modals, etc.)
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-git.ts         # Git operation hooks
│   │   ├── use-request.ts     # Request execution hooks
│   │   ├── use-workspace.ts   # Workspace management hooks
│   │   └── use-tauri.ts       # Tauri command hooks
│   ├── pages/                 # Application pages/routes
│   │   ├── workspace/         # Workspace management pages
│   │   ├── request/           # Request testing interface
│   │   ├── collection/        # Collection management
│   │   └── settings/          # Application settings
│   ├── utils/                 # Utility functions
│   │   ├── git.ts            # Git helper functions
│   │   ├── http.ts           # HTTP utility functions
│   │   ├── validation.ts     # Data validation utilities
│   │   └── format.ts         # Data formatting utilities
│   ├── types/                 # TypeScript type definitions
│   │   ├── workspace.ts       # Workspace-related types
│   │   ├── request.ts         # HTTP request/response types
│   │   ├── git.ts            # Git operation types
│   │   └── tauri.ts          # Tauri command types
│   ├── assets/               # Static assets (images, icons)
│   ├── styles/               # Global styles and Tailwind config
│   └── main.tsx              # React application entry point
├── src-tauri/                 # Rust backend application
│   ├── src/
│   │   ├── commands/          # Tauri command handlers
│   │   │   ├── workspace.rs   # Workspace operations
│   │   │   ├── git.rs        # Git operations
│   │   │   ├── http.rs       # HTTP request execution
│   │   │   ├── storage.rs    # Database operations
│   │   │   └── security.rs   # Credential management
│   │   ├── services/          # Business logic services
│   │   │   ├── git_service.rs # Git repository management
│   │   │   ├── http_service.rs # HTTP client implementation
│   │   │   ├── db_service.rs  # Database operations
│   │   │   └── workspace_service.rs # Workspace management
│   │   ├── models/            # Data models and types
│   │   │   ├── workspace.rs   # Workspace data structures
│   │   │   ├── request.rs     # HTTP request/response models
│   │   │   ├── git.rs        # Git operation models
│   │   │   └── common.rs     # Shared data structures
│   │   ├── utils/             # Utility functions
│   │   │   ├── crypto.rs     # Encryption utilities
│   │   │   ├── file.rs       # File system operations
│   │   │   └── validation.rs # Data validation
│   │   ├── error.rs           # Error types and handling
│   │   ├── state.rs           # Application state management
│   │   └── main.rs            # Tauri application entry point
│   ├── Cargo.toml             # Rust dependencies
│   ├── tauri.conf.json        # Tauri configuration
│   └── build.rs               # Build scripts
├── tests/                     # Test files
│   ├── unit/                  # Unit tests (Rust + TypeScript)
│   ├── integration/           # Integration tests
│   ├── e2e/                   # End-to-end tests
│   └── fixtures/              # Test data and fixtures
├── assets/                    # Application resources
│   ├── icons/                 # Platform-specific icons
│   └── images/                # Static images
├── scripts/                   # Build and development scripts
├── docs/                      # Project documentation
└── dist/                      # Built application output
```

---

## Tauri Architecture Patterns

### Frontend-Backend Communication

```typescript
// Frontend: Type-safe Tauri command invocation
import { invoke } from '@tauri-apps/api/tauri';

interface TauriCommands {
  // HTTP operations
  execute_http_request: (config: RequestConfig) => Promise<ResponseData>;
  cancel_http_request: (requestId: string) => Promise<void>;
  
  // Git operations
  git_clone_repository: (url: string, path: string, credentials?: GitCredentials) => Promise<CloneResult>;
  git_get_status: (repoPath: string) => Promise<GitStatus>;
  git_commit_changes: (repoPath: string, message: string) => Promise<CommitResult>;
  git_push_changes: (repoPath: string) => Promise<PushResult>;
  git_pull_changes: (repoPath: string) => Promise<PullResult>;
  
  // Workspace operations
  create_workspace: (config: WorkspaceConfig) => Promise<Workspace>;
  load_workspaces: () => Promise<Workspace[]>;
  save_workspace: (workspace: Workspace) => Promise<void>;
  delete_workspace: (workspaceId: string) => Promise<void>;
  
  // Storage operations
  save_request_history: (entry: RequestHistoryEntry) => Promise<void>;
  load_request_history: (workspaceId: string) => Promise<RequestHistoryEntry[]>;
  save_user_preferences: (preferences: UserPreferences) => Promise<void>;
  load_user_preferences: () => Promise<UserPreferences>;
  
  // Security operations
  store_credential: (key: string, value: string) => Promise<void>;
  retrieve_credential: (key: string) => Promise<string>;
  delete_credential: (key: string) => Promise<void>;
}

// Type-safe command wrapper
export const tauriCommand = {
  async executeHttpRequest(config: RequestConfig): Promise<ResponseData> {
    return invoke('execute_http_request', { config });
  },
  
  async gitCloneRepository(url: string, path: string, credentials?: GitCredentials): Promise<CloneResult> {
    return invoke('git_clone_repository', { url, path, credentials });
  },
  
  async createWorkspace(config: WorkspaceConfig): Promise<Workspace> {
    return invoke('create_workspace', { config });
  }
};
```

### Rust Backend Command Structure

```rust
// src-tauri/src/commands/mod.rs
use tauri::{command, State};
use crate::services::*;
use crate::models::*;
use crate::error::Result;

// HTTP request execution
#[command]
pub async fn execute_http_request(
    config: RequestConfig,
    state: State<'_, AppState>,
) -> Result<ResponseData> {
    state.http_service.execute_request(config).await
}

// Git repository cloning
#[command]
pub async fn git_clone_repository(
    url: String,
    path: String,
    credentials: Option<GitCredentials>,
    state: State<'_, AppState>,
) -> Result<CloneResult> {
    state.git_service.clone_repository(url, path, credentials).await
}

// Workspace creation
#[command]
pub async fn create_workspace(
    config: WorkspaceConfig,
    state: State<'_, AppState>,
) -> Result<Workspace> {
    state.workspace_service.create_workspace(config).await
}

// Event emission for real-time updates
#[command]
pub async fn start_git_operation(
    operation: GitOperation,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<()> {
    let git_service = state.git_service.clone();
    
    tokio::spawn(async move {
        let result = git_service.execute_operation(operation).await;
        
        // Emit progress events
        app_handle.emit_all("git-operation-complete", &result).unwrap();
    });
    
    Ok(())
}
```

---

## Domain-Driven Design Structure

### Core Domain Entities

```rust
// src-tauri/src/models/workspace.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub repository: Repository,
    pub team: Team,
    pub settings: WorkspaceSettings,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_accessed: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repository {
    pub url: String,
    pub local_path: String,
    pub branch: String,
    pub remote: String,
    pub credentials: Option<GitCredentials>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Team {
    pub owner: String,
    pub members: Vec<TeamMember>,
    pub permissions: HashMap<String, Permission>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceSettings {
    pub auto_sync: bool,
    pub sync_interval: u64,
    pub auto_commit: bool,
    pub require_pr: bool,
    pub default_environment: String,
}
```

```typescript
// src/types/workspace.ts - Frontend types matching Rust models
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  repository: Repository;
  team: Team;
  settings: WorkspaceSettings;
  createdAt: string;
  lastAccessed: string;
}

export interface Repository {
  url: string;
  localPath: string;
  branch: string;
  remote: string;
  credentials?: GitCredentials;
}

export interface Team {
  owner: string;
  members: TeamMember[];
  permissions: Record<string, Permission>;
}

export interface WorkspaceSettings {
  autoSync: boolean;
  syncInterval: number;
  autoCommit: boolean;
  requirePr: boolean;
  defaultEnvironment: string;
}
```

### Service Layer Architecture

```rust
// src-tauri/src/services/workspace_service.rs
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::models::*;
use crate::services::{GitService, DatabaseService};
use crate::error::{Result, WorkspaceError};

pub struct WorkspaceService {
    git_service: Arc<GitService>,
    db_service: Arc<DatabaseService>,
    active_workspaces: Arc<RwLock<HashMap<Uuid, Workspace>>>,
}

impl WorkspaceService {
    pub fn new(
        git_service: Arc<GitService>,
        db_service: Arc<DatabaseService>,
    ) -> Self {
        Self {
            git_service,
            db_service,
            active_workspaces: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    pub async fn create_workspace(
        &self,
        config: WorkspaceConfig,
    ) -> Result<Workspace> {
        // Validate workspace configuration
        self.validate_workspace_config(&config)?;
        
        // Initialize Git repository
        let repository = self.git_service
            .initialize_repository(&config.repository)
            .await?;
        
        // Create workspace structure
        let workspace = Workspace {
            id: Uuid::new_v4(),
            name: config.name,
            description: config.description,
            repository,
            team: config.team,
            settings: config.settings,
            created_at: chrono::Utc::now(),
            last_accessed: chrono::Utc::now(),
        };
        
        // Save to database
        self.db_service.save_workspace(&workspace).await?;
        
        // Add to active workspaces
        let mut active = self.active_workspaces.write().await;
        active.insert(workspace.id, workspace.clone());
        
        Ok(workspace)
    }
    
    pub async fn load_workspace(&self, workspace_id: Uuid) -> Result<Workspace> {
        // Check if already loaded
        {
            let active = self.active_workspaces.read().await;
            if let Some(workspace) = active.get(&workspace_id) {
                return Ok(workspace.clone());
            }
        }
        
        // Load from database
        let workspace = self.db_service
            .load_workspace(workspace_id)
            .await?
            .ok_or(WorkspaceError::NotFound(workspace_id))?;
        
        // Verify Git repository state
        self.git_service
            .verify_repository(&workspace.repository)
            .await?;
        
        // Add to active workspaces
        let mut active = self.active_workspaces.write().await;
        active.insert(workspace_id, workspace.clone());
        
        Ok(workspace)
    }
    
    pub async fn switch_workspace(
        &self,
        from_workspace_id: Option<Uuid>,
        to_workspace_id: Uuid,
    ) -> Result<Workspace> {
        // Save current workspace state if exists
        if let Some(from_id) = from_workspace_id {
            self.save_workspace_state(from_id).await?;
        }
        
        // Load target workspace
        let workspace = self.load_workspace(to_workspace_id).await?;
        
        // Update last accessed time
        self.update_last_accessed(to_workspace_id).await?;
        
        Ok(workspace)
    }
    
    async fn validate_workspace_config(
        &self,
        config: &WorkspaceConfig,
    ) -> Result<()> {
        // Validate name uniqueness
        if self.db_service.workspace_name_exists(&config.name).await? {
            return Err(WorkspaceError::NameAlreadyExists(config.name.clone()).into());
        }
        
        // Validate repository URL
        if !self.git_service.validate_repository_url(&config.repository.url).await? {
            return Err(WorkspaceError::InvalidRepositoryUrl(config.repository.url.clone()).into());
        }
        
        Ok(())
    }
}
```

---

## State Management Patterns

### Zustand Store Organization

```typescript
// src/stores/workspace.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { tauriCommand } from '@/utils/tauri';

interface WorkspaceStore {
  // State
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  
  // Computed values
  recentWorkspaces: Workspace[];
  activeProjects: Workspace[];
  
  // Actions
  setCurrentWorkspace: (workspace: Workspace) => void;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (config: WorkspaceConfig) => Promise<Workspace>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  refreshCurrentWorkspace: () => Promise<void>;
  
  // Git operations
  cloneWorkspace: (url: string, path: string) => Promise<Workspace>;
  syncWorkspace: (workspaceId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        currentWorkspace: null,
        workspaces: [],
        loading: false,
        error: null,
        
        // Computed values
        get recentWorkspaces() {
          return get().workspaces
            .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
            .slice(0, 5);
        },
        
        get activeProjects() {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          return get().workspaces.filter(
            w => new Date(w.lastAccessed) > oneWeekAgo
          );
        },
        
        // Actions
        setCurrentWorkspace: (workspace) => set((state) => {
          state.currentWorkspace = workspace;
        }),
        
        loadWorkspaces: async () => {
          set((state) => {
            state.loading = true;
            state.error = null;
          });
          
          try {
            const workspaces = await tauriCommand.loadWorkspaces();
            set((state) => {
              state.workspaces = workspaces;
              state.loading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error as string;
              state.loading = false;
            });
          }
        },
        
        createWorkspace: async (config) => {
          set((state) => {
            state.loading = true;
            state.error = null;
          });
          
          try {
            const workspace = await tauriCommand.createWorkspace(config);
            set((state) => {
              state.workspaces.push(workspace);
              state.currentWorkspace = workspace;
              state.loading = false;
            });
            return workspace;
          } catch (error) {
            set((state) => {
              state.error = error as string;
              state.loading = false;
            });
            throw error;
          }
        },
        
        switchWorkspace: async (workspaceId) => {
          const { currentWorkspace, workspaces } = get();
          const targetWorkspace = workspaces.find(w => w.id === workspaceId);
          
          if (!targetWorkspace) {
            throw new Error(`Workspace ${workspaceId} not found`);
          }
          
          set((state) => {
            state.loading = true;
            state.error = null;
          });
          
          try {
            // Use Tauri command for workspace switching
            const workspace = await invoke('switch_workspace', {
              fromWorkspaceId: currentWorkspace?.id,
              toWorkspaceId: workspaceId,
            });
            
            set((state) => {
              state.currentWorkspace = workspace;
              state.loading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error as string;
              state.loading = false;
            });
            throw error;
          }
        },
        
        cloneWorkspace: async (url, path) => {
          set((state) => {
            state.loading = true;
            state.error = null;
          });
          
          try {
            const result = await tauriCommand.gitCloneRepository(url, path);
            
            if (result.success) {
              const workspace = await invoke('load_workspace', { 
                path: result.path 
              });
              
              set((state) => {
                state.workspaces.push(workspace);
                state.currentWorkspace = workspace;
                state.loading = false;
              });
              
              return workspace;
            } else {
              throw new Error(result.message);
            }
          } catch (error) {
            set((state) => {
              state.error = error as string;
              state.loading = false;
            });
            throw error;
          }
        },
      })),
      {
        name: 'workspace-store',
        partialize: (state) => ({
          workspaces: state.workspaces,
          currentWorkspace: state.currentWorkspace,
        }),
      }
    ),
    { name: 'workspace-store' }
  )
);
```

### Cross-Store Communication

```typescript
// src/stores/index.ts - Store composition and cross-store actions
import { useWorkspaceStore } from './workspace';
import { useRequestStore } from './request';
import { useEnvironmentStore } from './environment';
import { useGitStore } from './git';

// Cross-store action example
export const useGlobalActions = () => {
  const workspaceStore = useWorkspaceStore();
  const requestStore = useRequestStore();
  const environmentStore = useEnvironmentStore();
  const gitStore = useGitStore();
  
  const switchWorkspaceWithCleanup = async (workspaceId: string) => {
    // Clear request state
    requestStore.clearActiveRequests();
    
    // Save current environment changes
    await environmentStore.saveCurrentEnvironment();
    
    // Switch workspace
    await workspaceStore.switchWorkspace(workspaceId);
    
    // Load new workspace context
    await environmentStore.loadWorkspaceEnvironments(workspaceId);
    await gitStore.refreshStatus();
  };
  
  const executeRequestWithGitTracking = async (request: RequestConfig) => {
    // Execute request
    const response = await requestStore.executeRequest(request);
    
    // Track in Git if auto-commit enabled
    const workspace = workspaceStore.currentWorkspace;
    if (workspace?.settings.autoCommit) {
      await gitStore.commitRequestExecution(request, response);
    }
    
    return response;
  };
  
  return {
    switchWorkspaceWithCleanup,
    executeRequestWithGitTracking,
  };
};
```

---

## Component Architecture

### Component Hierarchy and Patterns

```typescript
// src/components/workspace/WorkspaceSelector.tsx
import { memo, useMemo } from 'react';
import { useWorkspaceStore } from '@/stores/workspace';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { WorkspaceCard } from './WorkspaceCard';

interface WorkspaceSelectorProps {
  onWorkspaceSelect: (workspace: Workspace) => void;
  showRecentOnly?: boolean;
}

export const WorkspaceSelector = memo<WorkspaceSelectorProps>(({
  onWorkspaceSelect,
  showRecentOnly = false
}) => {
  const {
    workspaces,
    currentWorkspace,
    recentWorkspaces,
    loading,
    switchWorkspace
  } = useWorkspaceStore();
  
  const displayWorkspaces = useMemo(() => 
    showRecentOnly ? recentWorkspaces : workspaces,
    [workspaces, recentWorkspaces, showRecentOnly]
  );
  
  const handleWorkspaceSelect = async (workspace: Workspace) => {
    if (workspace.id !== currentWorkspace?.id) {
      await switchWorkspace(workspace.id);
      onWorkspaceSelect(workspace);
    }
  };
  
  if (loading) {
    return <WorkspaceSelectorSkeleton />;
  }
  
  return (
    <div className="workspace-selector">
      <div className="workspace-grid">
        {displayWorkspaces.map((workspace) => (
          <WorkspaceCard
            key={workspace.id}
            workspace={workspace}
            isActive={workspace.id === currentWorkspace?.id}
            onClick={handleWorkspaceSelect}
          />
        ))}
      </div>
      
      {displayWorkspaces.length === 0 && (
        <EmptyWorkspaceState onCreateWorkspace={onWorkspaceSelect} />
      )}
    </div>
  );
});

WorkspaceSelector.displayName = 'WorkspaceSelector';
```

### Custom Hook Patterns

```typescript
// src/hooks/use-tauri.ts - Tauri command wrapper hooks
import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

export function useTauriCommand<T extends any[], R>(
  command: string,
  options?: {
    onSuccess?: (result: R) => void;
    onError?: (error: string) => void;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<R | null>(null);
  
  const execute = useCallback(async (...args: T): Promise<R> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await invoke<R>(command, ...args);
      setData(result);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err as string;
      setError(errorMessage);
      options?.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [command, options]);
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);
  
  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
}

// Usage example
export function useGitOperations() {
  const cloneRepo = useTauriCommand<[string, string], CloneResult>('git_clone_repository');
  const getStatus = useTauriCommand<[string], GitStatus>('git_get_status');
  const commitChanges = useTauriCommand<[string, string], CommitResult>('git_commit_changes');
  
  return {
    cloneRepository: cloneRepo.execute,
    getRepositoryStatus: getStatus.execute,
    commitChanges: commitChanges.execute,
    loading: cloneRepo.loading || getStatus.loading || commitChanges.loading,
    error: cloneRepo.error || getStatus.error || commitChanges.error,
  };
}
```

---

## Error Handling Architecture

### Centralized Error Management

```rust
// src-tauri/src/error.rs
use thiserror::Error;
use serde::Serialize;

#[derive(Error, Debug, Serialize)]
pub enum AppError {
    #[error("Git operation failed: {0}")]
    Git(#[from] GitError),
    
    #[error("HTTP request failed: {0}")]
    Http(#[from] HttpError),
    
    #[error("Database operation failed: {0}")]
    Database(#[from] DatabaseError),
    
    #[error("Workspace error: {0}")]
    Workspace(#[from] WorkspaceError),
    
    #[error("Security error: {0}")]
    Security(#[from] SecurityError),
    
    #[error("Validation error: {message}")]
    Validation { message: String },
    
    #[error("Internal error: {0}")]
    Internal(String),
}

#[derive(Error, Debug, Serialize)]
pub enum GitError {
    #[error("Repository not found: {path}")]
    RepositoryNotFound { path: String },
    
    #[error("Clone failed: {url}")]
    CloneFailed { url: String },
    
    #[error("Merge conflict detected")]
    MergeConflict { conflicts: Vec<String> },
    
    #[error("Authentication failed")]
    AuthenticationFailed,
    
    #[error("Network error: {0}")]
    Network(String),
}

pub type Result<T> = std::result::Result<T, AppError>;

// Convert to Tauri error for frontend
impl From<AppError> for tauri::Error {
    fn from(err: AppError) -> Self {
        tauri::Error::Anyhow(anyhow::anyhow!(err))
    }
}
```

```typescript
// src/utils/error-handling.ts - Frontend error handling
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: ErrorCategory,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
  
  static fromTauriError(error: string): AppError {
    // Parse structured error from Rust
    try {
      const parsed = JSON.parse(error);
      return new AppError(
        parsed.message,
        parsed.code || 'UNKNOWN',
        parsed.category || 'internal',
        parsed.context
      );
    } catch {
      return new AppError(error, 'UNKNOWN', 'internal');
    }
  }
}

export type ErrorCategory = 'git' | 'http' | 'workspace' | 'validation' | 'security' | 'internal';

// Global error boundary
export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Application error:', error, errorInfo);
        // Report to error tracking service
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};
```

---

## Testing Architecture

### Rust Backend Testing

```rust
// src-tauri/src/tests/workspace_tests.rs
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use tokio_test;
    
    async fn setup_test_services() -> (Arc<GitService>, Arc<DatabaseService>) {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test.db");
        
        let git_service = Arc::new(GitService::new());
        let db_service = Arc::new(DatabaseService::new(db_path.to_str().unwrap()).await.unwrap());
        
        (git_service, db_service)
    }
    
    #[tokio::test]
    async fn test_create_workspace() {
        let (git_service, db_service) = setup_test_services().await;
        let workspace_service = WorkspaceService::new(git_service, db_service);
        
        let config = WorkspaceConfig {
            name: "Test Workspace".to_string(),
            description: Some("Test description".to_string()),
            repository: RepositoryConfig {
                url: "https://github.com/test/repo.git".to_string(),
                local_path: "/tmp/test-workspace".to_string(),
                branch: "main".to_string(),
                remote: "origin".to_string(),
                credentials: None,
            },
            team: TeamConfig::default(),
            settings: WorkspaceSettings::default(),
        };
        
        let workspace = workspace_service.create_workspace(config).await.unwrap();
        
        assert_eq!(workspace.name, "Test Workspace");
        assert!(workspace.id != Uuid::nil());
    }
    
    #[tokio::test]
    async fn test_workspace_switching() {
        let (git_service, db_service) = setup_test_services().await;
        let workspace_service = WorkspaceService::new(git_service, db_service);
        
        // Create two workspaces
        let workspace1 = workspace_service.create_workspace(test_config_1()).await.unwrap();
        let workspace2 = workspace_service.create_workspace(test_config_2()).await.unwrap();
        
        // Switch from workspace1 to workspace2
        let result = workspace_service
            .switch_workspace(Some(workspace1.id), workspace2.id)
            .await
            .unwrap();
        
        assert_eq!(result.id, workspace2.id);
    }
}
```

### Frontend Testing with Tauri Mocks

```typescript
// src/tests/components/WorkspaceSelector.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockIPC } from '@tauri-apps/api/mocks';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { TestProviders } from '@/tests/utils/TestProviders';

// Mock Tauri commands
beforeEach(() => {
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'load_workspaces':
        return Promise.resolve([
          {
            id: 'workspace-1',
            name: 'Test Workspace 1',
            description: 'First test workspace',
            repository: {
              url: 'https://github.com/test/repo1.git',
              localPath: '/tmp/workspace1',
              branch: 'main',
              remote: 'origin',
            },
            team: { owner: 'test@example.com', members: [], permissions: {} },
            settings: { autoSync: true, syncInterval: 300000 },
            createdAt: '2024-01-01T00:00:00Z',
            lastAccessed: '2024-01-01T00:00:00Z',
          },
        ]);
      case 'switch_workspace':
        return Promise.resolve({
          id: args.toWorkspaceId,
          // ... workspace data
        });
      default:
        return Promise.reject(`Unknown command: ${cmd}`);
    }
  });
});

test('renders workspace list and handles selection', async () => {
  const onSelect = jest.fn();
  
  render(
    <TestProviders>
      <WorkspaceSelector onWorkspaceSelect={onSelect} />
    </TestProviders>
  );
  
  // Wait for workspaces to load
  await waitFor(() => {
    expect(screen.getByText('Test Workspace 1')).toBeInTheDocument();
  });
  
  // Click on workspace
  fireEvent.click(screen.getByText('Test Workspace 1'));
  
  // Verify selection handler called
  await waitFor(() => {
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workspace-1',
        name: 'Test Workspace 1',
      })
    );
  });
});
```

---

## Build and Development Workflow

### Development Scripts

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write src/**/*.{ts,tsx}",
    "tauri:test": "cd src-tauri && cargo test",
    "tauri:clippy": "cd src-tauri && cargo clippy",
    "tauri:fmt": "cd src-tauri && cargo fmt"
  }
}
```

### CI/CD Pipeline Configuration

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build
      
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run Rust tests
        run: cd src-tauri && cargo test
      - name: Run Clippy
        run: cd src-tauri && cargo clippy -- -D warnings
      - name: Check formatting
        run: cd src-tauri && cargo fmt -- --check
        
  build-tauri:
    needs: [test-frontend, test-backend]
    strategy:
      matrix:
        platform: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Install dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev webkit2gtk-4.0-dev librsvg2-dev
      - run: npm ci
      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

*This codebase guide provides the architectural foundation for building a maintainable, performant Tauri-based application with clear separation of concerns between the Rust backend and React frontend.*